#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

import FeedParser from 'feedparser'
import pump from 'pump'
import words from 'lodash.words'

import * as feed from '../lib/feed.js'
import XMLGrep from '../lib/xmlgrep.js'
import JSONGrep from '../lib/jsongrep.js'
import * as u from '../lib/u.js'

let __dirname = new URL('.', import.meta.url).pathname

let errx = function(msg) {
    console.error(path.basename(process.argv[1]) + " error: " + msg)
    process.exit(1)
}

class MyGrep extends feed.Grep {
    to_s_rules(klass) {
	return {
	    "Array": function() { return this.join(", ") }
	}[klass]
    }

    meta(data) {
	let r = []
	for (let key in data) {
	    if (!this.is_printable(data[key])) continue
	    this.to_s_set_rules(data[key])
	    r.push(`${key}: ${data[key]}`)
	}
	r.push("")
	return r.join("\n")
    }

    article(article) {
	let r = []
	r.push("")

	;['summary', 'description']
	    .forEach( key => article[key] = feed.html2text(article[key]))

	for (let key in article) {
	    let val = article[key]
	    if (!this.is_printable(val)) continue

	    this.to_s_set_rules(val)

	    // if summary is a subset of desc, skip it
	    if (key === 'summary') {
		let [desc, sub] = ['description', 'summary']
		    .map(k => words(article[k]).join(''))
		if (desc.indexOf(sub) !== -1) continue
	    }

	    r.push(`${key}: ${val}`)
	}
	r.push("")
	return r.join("\n")
    }
}


// main

let argv = u.opts_parse(process.argv.slice(2))
if (argv.debug) console.error(argv)
if (argv.h || argv.help) {
    process.stdout.write(fs.readFileSync(__dirname + '/usage.txt').toString())
    process.exit(0)
}
if (argv.V) {
    console.log(JSON.parse(fs.readFileSync(__dirname + '../package.json')).version)
    process.exit(0)
}

let feedparser = new FeedParser()
let klass = MyGrep
if (argv.j) klass = JSONGrep
if (argv.x) klass = XMLGrep
let grep = new klass(argv, feedparser)

grep.on('finish', function() {
    if (!argv.m && this.articles_matched === 0) process.exitCode = 1
})

pump(process.stdin, feedparser, grep, process.stdout, err => {
    if (err && err.code !== 'EPIPE')
	errx(argv.debug ? err.stack : err.message)
})
