#!/usr/bin/env node

import http from 'http'
import querystring from 'querystring'
import fs from 'fs'
import path from 'path'
import {pipeline} from 'stream';

import mime from 'mime'
import FeedParser from 'feedparser'

import XMLGrep from '../lib/xmlgrep.js'
import JSONGrep from '../lib/jsongrep.js'

let __dirname = new URL('.', import.meta.url).pathname
let meta = JSON.parse(fs.readFileSync(__dirname + '../package.json'))

function user_agent() { return `${meta.name}/${meta.version}` }

function errx(res, code, msg) {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.statusCode = code
        res.statusMessage = msg.replace(/\s+/g, ' ')
    } catch (e) {
        console.error(`BAD errx(): ${e.message}`)
    }
    res.end()
    console.error(`ERROR: ${msg}`)
}

let set_cache_headers = function(res) {
    res.setHeader('Cache-Control', 'public; max-age=600')
    res.setHeader('Expires', new Date(Date.now() + 600*1000).toUTCString())
}

function serve_static(req, res, url) {
    if (url.pathname.match(/\/$/)) url.pathname += 'index.html'
    let fname = path.join(public_root, path.normalize(url.pathname))
    fs.stat(fname, (err, stats) => {
        if (err) return errx(res, 404, `${err.syscall} ${err.code}`)

        let readable = fs.createReadStream(fname)
        readable.once('data', () => {
            res.setHeader('Content-Length', stats.size)
            set_cache_headers(res)
            res.setHeader('Content-Type', mime.getType(fname))
        })
        readable.on('error', (err) => {
            errx(res, 500, `${err.syscall} ${err.code}`)
        })
        readable.pipe(res)
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
    if (req.method !== "GET") return errx(res, 501, "not implemented")

    let url = new URL(req.url, `http://${req.headers.host}`)
    if (!url.pathname.match(/^\/api/)) return serve_static(req, res, url)

    let argv = querystring.parse(url.search.replace(/^\?+/, ''))
    let xmlurl = argv.url
    if (!xmlurl) return errx(res, 412, "`?url=str` param is required")

    let controller = new AbortController()
    res.on('error', () => controller.abort())

    fetch(xmlurl, {
        headers: { 'User-Agent': user_agent() },
        signal: controller.signal
    }).then( xml => {
        if (xml.status !== 200)
            throw new Error(`upstream status is ${xml.status}`)

        let feedparser = new FeedParser()
        feedparser.on('error', err => {
            // catch FeedParser errors as soon as possible
            if (!res.headersSent)
                errx(res, 400, `${xmlurl}: feedparser: ${err.message}`)
        })

        let grep = argv.j ? new JSONGrep(argv, feedparser) : new XMLGrep(argv, feedparser)
        grep.once('data', () => {
            res.setHeader('Content-Type',
                          argv.j ? 'application/json' : 'text/xml')
            res.setHeader('Access-Control-Allow-Origin', '*')
            set_cache_headers(res)
        })
//        grep.on('finish', () => grep.destroy())

        pipeline(xml.body, feedparser, grep, res, (err) => {
            if (argv.debug) console.error('pipeline finish')
            if (!err) return
            if (!res.headersSent) {
                if (argv.debug) console.error(err.stack)
                errx(res, 400, `${xmlurl}: pipeline: ${err.message}`)
            }
        })
    }).catch( err => {
        errx(res, 500, `${xmlurl}: general: ${err.message}`)
    })
})

server.listen({
    host: process.env.HOST || '127.0.0.1',
    port: process.env.PORT || 3000
}, function() {
    console.error('Listening: http://'
                  + this.address().address + ":" + this.address().port)
})
