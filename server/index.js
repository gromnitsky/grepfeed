#!/usr/bin/env node

import http from 'http'
import url from 'url'
import fs from 'fs'
import path from 'path'

import request from 'request'
import mime from 'mime'
import FeedParser from 'feedparser'
import pump from 'pump'

import XMLGrep from '../lib/xmlgrep.js'
import JSONGrep from '../lib/jsongrep.js'

let __dirname = new URL('.', import.meta.url).pathname
let meta = JSON.parse(fs.readFileSync(__dirname + '../package.json'))


let user_agent = function() {
    return `${meta.name}/${meta.version} (${process.platform}; ${process.arch}) node/${process.versions.node}`
}

let errx = function(res, code, msg) {
    try {
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.statusCode = code
	res.statusMessage = msg.replace(/\s+/g, ' ')
    } catch (e) {
	console.error(`errx: ${e.message}`)
    }
    res.end()
    console.error(`ERROR: ${msg}`)
}

let set_cache_headers = function(res) {
    res.setHeader('Cache-Control', 'public; max-age=600')
    res.setHeader('Expires', new Date(Date.now() + 600*1000).toUTCString())
}

let serve_static = function(req, res, purl) {
    if (purl.pathname.match(/\/$/)) purl.pathname += 'index.html'
    let fname = path.join(public_root, path.normalize(purl.pathname))
    fs.stat(fname, (err, stats) => {
	if (err) {
	    errx(res, 404, `${err.syscall} ${err.code}`)
	    return
	}
	res.setHeader('Content-Length', stats.size)
	set_cache_headers(res)
	res.setHeader('Content-Type', mime.getType(fname))

	let stream = fs.createReadStream(fname)
	stream.on('error', (err) => {
	    errx(res, 500, `${err.syscall} ${err.code}`)
	})
	stream.pipe(res)
    })
}

// main

if (process.argv.length < 3) {
    console.error("Usage: index.js public_dir")
    process.exit(1)
}
process.chdir(process.argv[2])
let public_root = fs.realpathSync(process.cwd())

let server = http.createServer(function (req, res) {
    if (req.method !== "GET") {
	errx(res, 501, "not implemented")
	return
    }

    let purl = url.parse(req.url, true)
    if (!purl.pathname.match(/^\/api/)) {
	serve_static(req, res, purl)
	return
    }

    let argv = purl.query
    let xmlurl = argv.url
    if (!xmlurl) {
	errx(res, 412, "`?url=str` param is required")
	return
    }
    argv.size = parseInt(argv.size)

    let cur
    let size = 0
    try {
	cur = request.get({
	    url: xmlurl,
	    headers: { 'User-Agent': user_agent() }
	})
    } catch (e) {
	// usually it's an "Invalid URI" bump, like if you pass
	// file:///etc/passwd
	errx(res, 400, e.message)
	return
    }

    cur.on('error', (err) => {
	errx(res, 500, `${err.message}: ${xmlurl}`)
    }).on('data', (chunk) => {
	size += chunk.length
	if (argv.size && size >= argv.size) {
	    // the user has no clue why the data was incomplete
	    cur.abort()
	    console.error(`${xmlurl}: data >= ${argv.size}b`)
	}
    }).on('response', (xmlres) => {
	if (xmlres.statusCode !== 200) {
	    errx(res, xmlres.statusCode, `${xmlurl}: failed to fetch`)
	    return
	}
	// copy the content-type from the orig url unless we have -j opt
        let content_type = argv.j ? 'application/json' : (xmlres.headers['content-type'] || 'text/xml')
	res.setHeader('Content-Type', content_type)
	res.setHeader('Access-Control-Allow-Origin', '*')
	set_cache_headers(res)

	let feedparser = new FeedParser()
	feedparser.on('error', err => {
	    // to be able to return http/400 we should catch
	    // FeedParser errors as soon as possible
	    errx(res, 400, `${xmlurl}: ${err.message}`)
	})

	let grep = argv.j ? new JSONGrep(argv, feedparser) : new XMLGrep(argv, feedparser)
	pump(cur, feedparser, grep, res, err => {
	    if (!err) return
	    if (argv.debug) console.error(err.stack)
	    errx(res, 400, `${xmlurl}: ${err.message}`)
	})
    })

})

server.listen(process.env.PORT || 3000,
	      function() {
		  console.error('Listening: http://' + this.address().address +
				(this.address().port === 80 ?
				 "" : ":" + this.address().port))
})
