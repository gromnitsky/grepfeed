'use strict';

let Transform = require('stream').Transform

let html_ent_decode = require('ent/decode')

let u = require('./u')

let html_strip = function(html) {
    return html ? html.replace(/<(?:.|\n)*?>/gm, ' ') : ""
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
    toString() {
	return `${this.obj.url} (${this.obj.type} ${u.commas(this.obj.length)})`
    }
}

exports.Category = class Category {
    constructor(str) {
	this.data = exports.html2text(str)
    }
    toString() {
	return this.data.toString()
    }
    match(regexp) {
	return this.data.match(regexp)
    }
}

let itunes_keywords = function(str) {
    return str ? str.split(",").map( (idx) => new exports.Category(idx) ) : []
}

let author = function(str) {
    if (!str) return ""
    str = exports.html2text(str)
    if (!str.match(/@/)) return `rss@example.com (${str})`
    return str
}

exports.metadata = function(meta) {
    let r = {
	title: exports.html2text(meta.title),
	link: meta.link,
	pubDate: new exports.FDate(meta.date || meta.pubDate),
	managingEditor: author(meta.author),
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

    let owner = (obj) => {
	if (!obj) return ''
	let name = obj["itunes:name"] ? obj["itunes:name"]["#"] : ""
	let email = obj["itunes:email"] ? obj["itunes:email"]["#"] : "mail@example.com"
	if (name === "") return email
	return `${email} (${name})`
    }
    r["itunes:owner"] = owner(meta["itunes:owner"])

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

exports.article = function(item, count) {
    let r = {
	"#" : count,
	guid: item.guid,
	title: exports.html2text(item.title),
	pubDate: new exports.FDate(item.date || item.pubDate),
	link: item.origlink || item.permalink || item.link,
	summary: item.summary,	// possibly html
	description: item.description, // possibly html
	author: author(item.author),
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
		   article.author].filter( (idx) => idx)
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
    constructor(opts) {
	super()
	this._writableState.objectMode = true // we can eat objects

	this.opts = opts || {}
	this.articles_counter = 0
	this.articles_matched = 0
	this.expect = !this.opts.v

	this.got_first_item = false
	this.logger = console.error.bind(console, 'Grep:')
    }

    log(...args) { if (this.opts.debug) this.logger(...args) }

    header() { return '' }
    footer() { return '' }

    meta(_data) { throw new Error('implement me!') }
    article(_obj) { throw new Error('implement me!') }
    to_s_rules(_klass) { throw new Error('implement me!') }

    push_meta(input) {
	if (!this.got_first_item) {
	    this.push(this.header())
	    this.push(this.meta(exports.metadata(input.meta)))
	    this.got_first_item = true
	}
    }

    _transform(input, encoding, done) {
	if (this.opts.m) {	// extract only meta
	    this.push_meta(input)
	    done()
	    return
	}

	let item = exports.article(input, ++this.articles_counter)
	if (this.opts.n && this.articles_matched >= this.opts.n) {
	    this.log('-n', this.articles_counter)
	    // FIXME: how to signal the upstream we don't want the data anymore?
	    done()
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
