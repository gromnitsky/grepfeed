'use strict';

let Transform = require('stream').Transform
let parse5 = require('parse5')

let html_ent_decode = require('ent/decode')
let get = require('lodash.get')
let addressparser = require('addressparser')

let u = require('./u')

let html_grab_text_nodes = function() {
    let texts = []
    return function walk(kids) {
	(kids.childNodes || kids).forEach( node => {
	    if (/^(head|script|style)$/.test(node.nodeName)) return
	    if (node.nodeName === '#text') texts.push(node.value)
	    if (node.childNodes) walk(node.childNodes)
	})
	return texts
    }
}

let html_strip = function(html) {
    if (!html) return ""
    let doc = parse5.parseFragment(html)
    return html_grab_text_nodes()(doc).join(' ')
}

exports.html2text = function(html) {
    if (!html) return ""
    return html_ent_decode(html_strip(html).replace(/\s+/g, ' ').trim())
}

exports.FDate = class FDate extends Date {
    toString() {
	return this.toUTCString()
    }
}

exports.Enclosure = class Enclosure {
    constructor(obj) {
	this.obj = obj
    }
    toJSON() { return this.obj }
    toString() {
	return `${this.obj.url} (${this.obj.type} ${u.commas(this.obj.length)})`
    }
}

exports.Category = class Category {
    constructor(str) {
	this.data = exports.html2text(str)
    }
    toString() { return this.data.toString() }
    toJSON() { return this.data }
    match(regexp) { return this.data.match(regexp) }
}

let itunes_keywords = function(str) {
    return str ? str.split(",").map( (idx) => new exports.Category(idx) ) : []
}

exports.Author = class Author {
    constructor(name, email) {
	let name_or_email = addressparser(name)[0]
	this.name = exports.html2text(get(name_or_email, 'name'))
	this.email_placeholder = 'rss@example.com'
	this.email = email || get(name_or_email, 'address') || this.email_placeholder
    }
    toJSON() { return this.toString() }
    toString() {
	if (this.name && this.email) return `${this.email} (${this.name})`
	return this.name || this.email
    }
}

let author = function(arr) { // arr - from the most desirable to the least
    let r = new exports.Author()
    arr.filter( val => val).forEach( val => {
	if (!r.name && val.name) r.name = val.name
	if (r.email === r.email_placeholder && val.email) r.email = val.email
    })
    return r
}

exports.metadata = function(meta) {
    let r = {
	title: exports.html2text(meta.title),
	link: meta.link,
	pubDate: new exports.FDate(meta.date || meta.pubDate),
	managingEditor: author([new exports.Author(get(meta["atom:author"], "name.#"), get(meta["atom:author"], "email.#")),
				new exports.Author(meta.author),
				new exports.Author(get(meta["rss:managingeditor"], "name"), get(meta["rss:managingeditor"], "email")),
				new exports.Author(get(meta["rss:webmaster"], "name"), get(meta["rss:webmaster"], "email"))]),
	description: exports.html2text(meta.description),
	copyright: exports.html2text(meta.copyright),
	language: meta.language,
	generator: exports.html2text(meta.generator),
	categories: meta.categories.map( (idx) => new exports.Category(idx))
    }

    // grab itunes data only if its namespace is specified
    if (!meta['#ns'].some( val => Object.keys(val)[0] === 'xmlns:itunes'))
	return r

    r["itunes:keywords"] = meta["itunes:keywords"] && itunes_keywords(meta["itunes:keywords"]["#"])
    r["itunes:explicit"] = meta["itunes:explicit"] && meta["itunes:explicit"]["#"]

    r["itunes:owner"] = new exports.Author(get(meta["itunes:owner"], "itunes:name.#"), get(meta["itunes:owner"], "itunes:email.#"))
    r.managingEditor = author([r.managingEditor, r["itunes:owner"]])

    // itunes:category is an hierarchy that we convert into a flat array
    let flatcat = function() {
	let arr = []
	return function category(obj) {
	    if (!obj) return arr

	    if (Array.isArray(obj)) obj.forEach( val => category(val))

	    let nested = obj['itunes:category']
	    if (nested) category(nested)

	    if (obj['@']) arr.push(obj['@'].text)
	    return arr
	}
    }
    r["itunes:category"] = flatcat()(meta["itunes:category"])

    return r
}

exports.article = function(item, count, meta) {
    let r = {
	"#" : count,
	guid: item.guid,
	title: exports.html2text(item.title),
	pubDate: new exports.FDate(item.date || item.pubDate),
	link: item.origlink || item.link || item.permalink,
	summary: item.summary,	// possibly html
	description: item.description, // possibly html
	author: author([new exports.Author(get(item["atom:author"], "name.#"), get(item["atom:author"], "email.#")),
			new exports.Author(item.author),
			meta.managingEditor,
			new exports.Author(meta.title)]),
	categories: item.categories.map( (idx) => new exports.Category(idx) ),
	enclosures: item.enclosures.map( (idx) => new exports.Enclosure(idx) )
    }

    return r
}

exports.article_match = function(article, opts) {
    if (opts.e && article.enclosures.length === 0) return false
    if (opts.d && !exports.date_match(opts.d, article.pubDate)) return false
    if (opts.c && !exports.category_match(opts.c, article.categories)) return false

    if (opts._ && opts._.length !== 0) {
	let arr = [article.title,
		   exports.html2text(article.summary),
		   exports.html2text(article.description),
		   article.author.name].filter( val => val)
	// using only 1st non-option CL argument as a pattern
	let term = Array.isArray(opts._) ? opts._[0] : opts._
	if (!exports.category_match(term, arr))
	    return false
    }

    return true
}

exports.GrepError = class GrepError extends Error {
    constructor(msg) {
	super(msg)
	this.name = exports.GrepError.name
	if (Error.captureStackTrace)
	    Error.captureStackTrace(this, exports.GrepError)
    }
}

let is_date = function(date) { return !isNaN(date) }

exports.date_match = function(pattern, src) {
    if (!pattern) return true
    if (!is_date(src)) return false

    let pair = pattern.split(",")

    if (pair[0][0] === "-") {
	let date = new Date(pair[0].slice(1))
	if (!is_date(date)) throw new exports.GrepError("invalid date pattern")
	return (src <= date)
    }

    if (pair.length === 1) {
	let date = new Date(pair[0])
	if (!is_date(date)) throw new exports.GrepError("invalid date pattern")
	return (src >= date)
    }

    let d1 = new Date(pair[0])
    let d2 = new Date(pair[1])
    if (![d1, d2].every( val => is_date(val)))
	throw new exports.GrepError("invalid date pattern")
    if (d1 > d2) throw new exports.GrepError("invalid date pattern")
    return (d1 <= src && src <= d2)
}

exports.category_match = function(pattern, src) {
    if (!pattern) return true
    if (!src) return false

    let re = new RegExp(pattern, "i")
    return src.some( val => val.match(re))
}

exports.Grep = class extends Transform {
    constructor(opts, feedparser) {
	super()
	this._writableState.objectMode = true // we can eat objects

	this.opts = opts || {}
	this.articles_counter = 0
	this.articles_matched = 0
	this.expect = !this.opts.v

	this.got_first_item = false
	this.logger = console.error.bind(console, 'Grep:')

	this.feedparser = feedparser
	if (this.feedparser) {
	    this.once('unpipe', () => {
		this.log('unpipe')
		this.end()	// ensure 'finish' event gets emited
	    })
	}
    }

    log(...args) { if (this.opts.debug) this.logger(...args) }

    header() { return '' }
    footer() { return '' }

    meta(_data) { throw new Error('implement me!') }
    article(_obj) { throw new Error('implement me!') }
    to_s_rules(_klass) {}

    push_meta() {
	if (!this.got_first_item) {
	    this.push(this.header())
	    this.push(this.meta(this._meta))
	    this.got_first_item = true
	}
    }

    stop() { if (this.feedparser) this.feedparser.unpipe(this) }

    _transform(input, encoding, done) {
	this._meta = this._meta || exports.metadata(input.meta)
	if (this.opts.m) {	// extract only meta
	    this.log('-m')
	    this.push_meta()
	    done()
	    this.stop()
	    return
	}

	let item = exports.article(input, ++this.articles_counter, this._meta)
	if (this.opts.n && this.articles_matched >= this.opts.n) {
	    this.log('-n', this.articles_counter)
	    done()
	    this.stop()
	    return
	}

	// by default `expect` is true, unless we have -v CLO
	if (exports.article_match(item, this.opts) === this.expect) {
	    this.articles_matched++
	    this.push_meta(input)
	    this.push(this.article(item))
	}
	done()
    }

    _flush(done) {
	if (!this.got_first_item) this.push(this.header())
	this.push(this.footer())
	done()
    }

    to_s_set_rules(obj) {
	let klass = obj.constructor.name
	if (this.to_s_rules(klass)) {
	    obj.toString = this.to_s_rules(klass)
	}
	// go deep
	if (Array.isArray(obj)) obj.forEach( (idx) => {
	    this.to_s_set_rules(idx) // recursion
	})
    }

    is_printable(obj) { return obj && obj.length !== 0 }
}
