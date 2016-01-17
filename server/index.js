#!/usr/bin/env node

'use strict';

let http = require('http')
let url = require('url')
let fs = require('fs')
let path = require('path')

let request = require('request')
let mime = require('mime')

let feed = require('../lib/feed')
let meta = require('../package.json')


let user_agent = function() {
    return `${meta.name}/${meta.version} (${process.platform}; ${process.arch}) node/${process.versions.node}`
}

// a flag to prevent a double erroring during a request
let request_had_error = false

let errx = function(res, code, msg) {
    if (!request_had_error) {
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.statusCode = code
	res.statusMessage = msg
	res.end()
    }
    console.error(`ERROR: ${msg}`)
    request_had_error = true
}

class MyGrepHTTP extends feed.MyGrepXML {
    event_fp_error(err) {
	let msg = err.message
	if (this.opts.debug) msg += "\n" + err.stack
	errx(this.opts.__http.res, 400, `${this.opts.__http.xmlurl}: ${msg}`)
    }
}

let serve_static = function(req, res, purl) {
    if (purl.pathname.match(/\/$/)) purl.pathname += 'index.html'
    let fname = path.join(public_root, purl.pathname)
    fs.stat(fname, (err, stats) => {
	if (err) {
	    errx(res, 404, `${err.syscall} ${err.code}`)
	    return
	}
	res.setHeader('Content-Length', stats.size)
	res.setHeader('Last-Modified', stats.mtime.toUTCString())
	res.setHeader('Content-Type', mime.lookup(fname))

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
    request_had_error = false
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
	    errx(res, xmlres.statusCode, `error retrieving url: ${xmlurl}`)
	    return
	}
	// copy the content-type value from the orig url
	res.setHeader('Content-Type', xmlres.headers['content-type'])
	res.setHeader('Access-Control-Allow-Origin', '*')

	argv.__http = {
	    res: res,
	    xmlurl: xmlurl
	}
	let mfp = new MyGrepHTTP(argv)
	cur.once("end", () => {
	    mfp.fp.end()
	    mfp.fp.emit("end")
	})

	cur.pipe(mfp).pipe(res)
    })

})

server.listen(process.env.PORT || 3000, process.env.HOSTNAME || '127.0.0.1',
	      function() {
		  console.error('http://' + this.address().address +
				(this.address().port === 80 ?
				 "" : ":" + this.address().port))
})
