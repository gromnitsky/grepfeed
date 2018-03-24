#!/usr/bin/env node

'use strict';

let http = require('http')
let url = require('url')
let fs = require('fs')
let path = require('path')

let request = require('request')
let mime = require('mime')
let FeedParser = require('feedparser')
let pump = require('pump')

let XMLGrep = require('../lib/xmlgrep')
let meta = require('../package.json')


let user_agent = function() {
    return `${meta.name}/${meta.version} (${process.platform}; ${process.arch}) node/${process.versions.node}`
}

// a flag to prevent accidental sending headers twice
let headers_are_sent = false

let errx = function(res, code, msg) {
    if (!headers_are_sent) {
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.statusCode = code
	res.statusMessage = msg.replace(/\s+/g, ' ')
	res.end()
    }
    console.error(`ERROR: ${msg}`)
    headers_are_sent = true
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
    headers_are_sent = false
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
	// copy the content-type value from the orig url
	res.setHeader('Content-Type', xmlres.headers['content-type'])
	res.setHeader('Access-Control-Allow-Origin', '*')
	set_cache_headers(res)

	let feedparser = new FeedParser()
	feedparser.on('error', err => {
	    // to be able to return http/400 we should catch
	    // FeedParser errors as soon as possible
	    errx(res, 400, `${xmlurl}: ${err.message}`)
	})

	let grep = new XMLGrep(argv)
	grep.once('data', () => {
	    headers_are_sent = true
	})
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
