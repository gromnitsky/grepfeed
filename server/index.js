#!/usr/bin/env node

'use strict';

let http = require('http')
let url = require('url')

let request = require('request')

let feed = require('../lib/feed')


let errx = function(res, code, msg) {
    res.statusCode = code
    res.statusMessage = msg
    res.setHeader('Content-Type', 'text/plain')
    res.end()
    console.error(`ERROR: ${msg}`)
}

class MyGrepHTTP extends feed.MyGrepXML {
    event_fp_error(err) {
	let msg = err.message
	if (this.opts.debug) msg += "\n" + err.stack
	let prefix = "feedparser: "
	if (err instanceof feed.GrepError) prefix = ""
	errx(this.opts.__http.res, 400, `${this.opts.__http.xmlurl}: ${prefix}${msg}`)
    }
}

let urlfeed = function(argv) {
    if (!argv.url) return null
    let name = argv.url.trim()
    return (name.length === 0) ? null : name
}


// main

let server = http.createServer(function (req, res) {
    let argv = url.parse(req.url, true).query
    let xmlurl = urlfeed(argv)
    if (!xmlurl) {
	errx(res, 412, "`?url=str` param is required")
	return
    }

    let cur = request.get({
	url: xmlurl,
	headers: {
	    'User-Agent': req.headers['user-agent'] || 'omglol'
	}
    }).on('error', (err) => {
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
