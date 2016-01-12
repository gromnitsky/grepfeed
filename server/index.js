#!/usr/bin/env node

'use strict';

let http = require('http')
let url = require('url')

let request = require('request')

let feed = require('../lib/feed')
let meta = require('../package.json')


let user_agent = function() {
    return `${meta.name}/${meta.version} (${process.platform}; ${process.arch}) node/${process.versions.node}`
}

// a flag to prevent a double erroring during a request
let request_had_error = false

let errx = function(res, code, msg) {
    if (!request_had_error) {
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


// main

let server = http.createServer(function (req, res) {
    request_had_error = false
    let argv = url.parse(req.url, true).query
    let xmlurl = argv.url
    if (!xmlurl) {
	errx(res, 412, "`?url=str` param is required")
	return
    }

    let cur
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
    }).on('response', (xmlres) => {
	if (xmlres.statusCode !== 200) {
	    errx(res, xmlres.statusCode, `error retrieving url: ${xmlurl}`)
	    return
	}
	// copy the content-type value from the orig url
	res.setHeader('Content-Type', xmlres.headers['content-type'])

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

server.listen(8000)
