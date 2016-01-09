'use strict';

let EventEmitter = require('events')
let util = require('util')
let Transform = require('stream').Transform

let html_ent_decode = require('ent/decode')
let FeedParser = require('feedparser')
let xml_encode = require('ent/encode')

Date.prototype.toString = function() {
    return this.toUTCString()
}

Array.prototype.indexOf_object_key = function(str) {
    if (!str || str.match(/^\s*$/)) return -1
    let idx = 0
    for (idx = 0; idx < this.length; ++idx) {
	let key = Object.keys(this[idx])[0]
	if (key === str) return idx
    }
    return -1
}

// an applicant for The Daily WTF
let array_or_null = function(val) {
    if (Array.isArray(val)) {
	return (val.length === 0 ? null : val)
    }
    return val
}

exports.Enclosure = class Enclosure {
    constructor(obj) {
	this.obj = obj
    }
    toString() {
	return `${this.obj.url} (${this.obj.type} ${this.obj.length})`
    }
}

// FIXME: extend from String?
exports.Category = class Category {
    constructor(str) {
	this.name = str.trim()
    }
    toString() {
	return this.name.toString()
    }
    match(regexp) {
	return this.name.match(regexp)
    }
}

let itunes_keywords = function(str) {
    return array_or_null(str.split(",")
			 .map( (idx) => new exports.Category(idx) ))
}

let author = function(str) {
    if (!str) return ""
    if (!str.match(/@/)) return `rss@example.com (${str})`
    return str
}

exports.meta2arr = function(meta) {
    let r = {
	title: meta.title,
	link: meta.link,
	pubDate: meta.date || meta.pubDate,
	managingEditor: author(meta.author),
	description: meta.description && meta.description.replace(/\s+/g, ' '),
	copyright: meta.copyright,
	language: meta.language,
	generator: meta.generator,
	categories: array_or_null(meta.categories.map( (idx) => new exports.Category(idx)) )
    }

    // itunes
    if (meta['#ns'].indexOf_object_key('xmlns:itunes') !== -1) {
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

	// itunes' category is an hierarchy that we want convert
	// into a flat array, thus hello recursion
	let category = (cat, r) => {
	    if (!cat) return
	    if (Array.isArray(cat)) {
		// recursion
		cat.forEach( (idx) => category(idx, r))
		return
	    }

	    r.push(cat["@"].text)
	    if (cat["itunes:category"])
		category(cat["itunes:category"], r) // recursion
	}
	let category_result = []
	category(meta["itunes:category"], category_result)
	r["itunes:category"] = array_or_null(category_result)
    }

    return r
}

String.prototype.html_strip = function(html) {
    return this.replace(/<.+?>/g, ' ')
}

// or use w3m instead?
let html2text = function(html) {
    if (!html) return ""
    return html_ent_decode(html.html_strip().replace(/\s+/g, ' ').trim())
}

exports.article = function(item, count) {
    let r = {
	"#" : count,
	guid: item.guid,
	title: item.title,
	pubDate: item.date || item.pubDate,
	link: item.origlink || item.permalink || item.link,
	"summary.__text": html2text(item.summary),
	summary: item.summary,
	"description.__text": html2text(item.description),
	description: item.description,
	author: author(item.author),
	categories: array_or_null(item.categories.map( (idx) => new exports.Category(idx) )),
	enclosures: array_or_null(item.enclosures.map( (idx) => new exports.Enclosure(idx) ))
    }

    return r
}

exports.article_match = function(article, opts) {
    if (opts.e && !article.enclosures) return false
    if (opts.d && !exports.date_match(opts.d, article.pubDate)) return false
    if (opts.c && !exports.category_match(opts.c, article.categories)) return false

    if (opts._ && opts._.length !== 0) {
	let arr = [article.title,
		   article["summary.__text"],
		   article["description.__text"],
		   article.author].filter( (idx) => idx)
	// using only 1st non-option CL argument as a pattern
	if (!exports.category_match(opts._[0], arr))
	    return false
    }

    return true
}

// everybody loves JS
let is_date = function(date) {
    if (Object.prototype.toString.call(date) !== "[object Date]") return false
    return !isNaN(date.getTime())
}

exports.GrepError = class GrepError extends Error {
    constructor(msg) {
	super(msg)
	this.name = exports.GrepError.name
	Error.captureStackTrace(this, exports.GrepError)
    }
}

exports.date_match = function(pattern, src) {
    if (!pattern) return true
    if (pattern && !is_date(src)) return false

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
    let d2 = new Date(pair[1]);	// the semicolon here is important
    [d1, d2].forEach( (idx) => {
	if (!is_date(idx)) throw new exports.GrepError("invalid date pattern")
    })
    if (d1 > d2) throw new exports.GrepError("invalid date pattern")
    return (d1 <= src && src <= d2)
}

exports.category_match = function(pattern, src) {
    if (!pattern) return true
    if (pattern && !array_or_null(src)) return false

    let re = new RegExp(pattern, "i")
    let r = false
    src.forEach( (idx) => {
	if (idx.match(re)) {
	    r = true
	    return
	}
    })
    return r
}

exports.Grep = class Grep extends Transform {

    // opts -- a result from minimist
    constructor(opts) {
	super()
	let that = this
	this.opts = opts
	this.expect = !opts.v	// see fp 'readable' event handler below
	this.reset()

	this.event = new EventEmitter()
	this.event.once('meta', () => {
	    this.print_meta(this.meta)
	})

	this.fp = new FeedParser({ addmeta: false })

	this.fp.on('error', function(e) {
	    that.event_fp_error(e)
	})

	this.fp.on('end', function() {
	    // react on -m CLO only after all articles were analyzed
	    if (that.opts.m) that.event.emit("meta")
	    that.event.emit("end")
	})

	this.fp.on('meta', function() {
	    if (that.opts.m && that.opts.debug)
		that.log(util.inspect(this.meta, { depth: null }))
	    that.meta = exports.meta2arr(this.meta)
	})

	this.fp.on('readable', function() {
	    let stream = this
	    let item

	    while ((item = stream.read()) ) {
		that._article_count++
		let r = exports.article(item, that._article_count)
		that.articles.push(r)
		if (that.opts.m) return

		// -n CLO
		if (that.opts.n && that._articles_matched >= that.opts.n) {
		    that.event.emit("end")
		    return
		}

		// by default, that.expect is true, but it's false with -v CLO
		if (exports.article_match(r, that.opts) === that.expect) {
		    that._articles_matched++
		    that.print_article(r)
		    if (that.opts.debug)
			that.log(util.inspect(item, { depth: null }))
		}
	    }
	})
    }

    log(msg) {
	console.error(msg)
    }

    reset() {
	this._article_count = 0
	this._article_text_prop = {}
	this._articles_matched = 0
	this.articles = []
	this.meta = []
    }

    _transform(chunk, encoding, done) {
	this.fp.write(chunk)
	done()
    }

    event_fp_error(err) {
	throw new exports.GrepError('override me')
    }

    encl_stat() {
	let encl = {
	    articles: 0,
	    total: 0
	}
	this.articles.forEach( (item) => {
	    if (!item.enclosures) return
	    encl.articles++
	    encl.total += item.enclosures.length
	})
	return encl
    }

    // use `this.push(string)` inside, to pass down the data to the
    // downstream
    print_meta(data) {
	throw new exports.GrepError('override me')
    }

    print_article(article) {
	throw new exports.GrepError('override me')
    }
}

exports.MyGrepXML = class MyGrepXML extends exports.Grep {

    // an example
    event_fp_error(err) {
	let msg = err.message
	if (this.opts.debug) msg += "\n" + err.stack
	let prefix = "feedparser: "
	if (err instanceof exports.GrepError) prefix = ""
	this.log(`${prefix}${msg}`)
    }

    constructor(opts) {
	super(opts)

	Array.prototype.toString = function() {
	    return this.join("\n")
	}
	exports.Enclosure.prototype.toString = function() {
	    return `<enclosure url="${this.obj.url}" type="${this.obj.type}" length="${this.obj.length}" />`
	}
	exports.Category.prototype.toString = function() {
	    return `<category>${xml_encode(this.name)}</category>`
	}

	this.event.once("end", () => {
	    if (this._articles_matched !== 0 || opts.m)
		this.push("\n</channel>\n</rss>\n")
	    this.end()		// we're done here
	})
    }

    print_meta(data) {
	let r = []
	r.push(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>`)
	for (let key in data) {
	    if (!data[key] || key.match(/^(itunes):/)) continue
	    if (key === "categories") {
		r.push(data[key].toString())
		continue
	    }
	    r.push(`<${key}>${xml_encode(data[key].toString())}</${key}>`)
	}
	r.push("")
	this.push(r.join("\n"))
    }

    print_article(article) {
	let r = []
	if (this._articles_matched === 1) this.print_meta(this.meta)

	r.push("\n<item>")
	for (let key in article) {
	    if (!article[key]) continue
	    if (this._article_text_prop[key]) continue

	    if (key.match(/\.__text$/))
		this._article_text_prop[key.split(".")[0]] = true

	    let val = xml_encode(article[key].toString())

	    if (key.match(/^summary/)) continue // rss 2.0 lacks it
	    if (key.match(/^#$/)) {
		r.push(`<!-- ${key}: ${val} -->`)
		continue
	    }
	    if (key.match(/^(categories|enclosures)$/)) {
		r.push(article[key].toString())
		continue
	    }
	    if (key.match(/^description/)) key = "description"

	    r.push(`<${key}>${val}</${key}>`)
	}

	r.push("</item>\n")
	this.push(r.join("\n"))
    }
}
