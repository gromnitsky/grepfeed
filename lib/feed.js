import stream from 'stream'
import parse5 from 'parse5'

import ent from 'ent'
import get from 'lodash.get'
import addressparser from 'addressparser'

import * as u from './u.js'

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

export function html2text(html) {
    if (!html) return ""
    return ent.decode(html_strip(html).replace(/\s+/g, ' ').trim())
}

function html_sanitize(html) {
    let defaultTreeAdapter = parse5.treeAdapters.default
    let adapter = Object.create(defaultTreeAdapter)

    let unwanted = node => /^(script|style)$/.test(node.nodeName)
    let rm_unwanted_attrs = node => {
	if (!node.attrs) return
	node.attrs = node.attrs
	    .filter(v => !(v.name.slice(0,2) === 'on'
			   || (/^\s*javascript:/).test(v.value)))
    }
    adapter.appendChild = (parentNode, newNode) => {
    	if (unwanted(newNode)) return
	rm_unwanted_attrs(newNode)
    	defaultTreeAdapter.appendChild(parentNode, newNode)
    }
    adapter.insertBefore = (parentNode, newNode, referenceNode) => {
    	if (unwanted(newNode)) return
	rm_unwanted_attrs(newNode)
    	defaultTreeAdapter.insertBefore(parentNode, newNode, referenceNode)
    }

    let doc = parse5.parseFragment(html || '', { treeAdapter: adapter })
    return parse5.serialize(doc)
}

export class FDate extends Date {
    toString() {
	return this.toUTCString()
    }
}

export class Enclosure {
    constructor(obj) {
        this.length = Number(obj.length) || 0
        this.type = obj.type || 'application/octet-stream'
        this.url = obj.url || 'http://example.com/invalid-enclosure-url'
    }
    toJSON() { return {length: this.length, type: this.type, url: this.url } }
    toString() {
        return `${this.url} (${this.type} ${u.commas(this.length)})`
    }
}

export class Category {
    constructor(str) {
	this.data = html2text(str)
    }
    toString() { return this.data.toString() }
    toJSON() { return this.data }
    match(regexp) { return this.data.match(regexp) }
}

let itunes_keywords = function(str) {
    return str ? str.split(",").map( (idx) => new Category(idx) ) : []
}

export class Author {
    constructor(name, email) {
	let name_or_email = addressparser(name)[0]
	this.name = html2text(get(name_or_email, 'name'))
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
    let r = new Author()
    arr.filter( val => val).forEach( val => {
	if (!r.name && val.name) r.name = val.name
	if (r.email === r.email_placeholder && val.email) r.email = val.email
    })
    return r
}

export function metadata(meta) {
    let r = {
	title: html2text(meta.title),
	link: meta.link,
	pubDate: new FDate(meta.date || meta.pubDate),
	managingEditor: author([new Author(get(meta["atom:author"], "name.#"), get(meta["atom:author"], "email.#")),
				new Author(meta.author),
				new Author(get(meta["rss:managingeditor"], "name"), get(meta["rss:managingeditor"], "email")),
				new Author(get(meta["rss:webmaster"], "name"), get(meta["rss:webmaster"], "email"))]),
	description: html2text(meta.description),
	copyright: html2text(meta.copyright),
	language: meta.language,
	generator: html2text(meta.generator),
	categories: meta.categories.map( (idx) => new Category(idx))
    }

    // grab itunes data only if its namespace is specified
    if (!meta['#ns'].some( val => Object.keys(val)[0] === 'xmlns:itunes'))
	return r

    r["itunes:keywords"] = meta["itunes:keywords"] && itunes_keywords(meta["itunes:keywords"]["#"])
    r["itunes:explicit"] = meta["itunes:explicit"] && meta["itunes:explicit"]["#"]

    r["itunes:owner"] = new Author(get(meta["itunes:owner"], "itunes:name.#"), get(meta["itunes:owner"], "itunes:email.#"))
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

export function article(item, count, meta) {
    let r = {
	"#" : count,
	guid: item.guid,
	title: html2text(item.title),
	pubDate: new FDate(item.date || item.pubDate),
	link: item.origlink || item.link || item.permalink,
        summary: html_sanitize(item.summary),         // possibly html
        description: html_sanitize(item.description), // possibly html
	author: author([new Author(get(item["atom:author"], "name.#"), get(item["atom:author"], "email.#")),
			new Author(item.author),
			meta.managingEditor,
			new Author(meta.title)]),
	categories: item.categories.map( (idx) => new Category(idx) ),
	enclosures: item.enclosures.map( (idx) => new Enclosure(idx) )
    }

    return r
}

export function article_match(article, opts) {
    if (opts.e && article.enclosures.length === 0) return false
    if (opts.d && !date_match(opts.d, article.pubDate)) return false
    if (opts.c && !category_match(opts.c, article.categories)) return false

    if (opts._ && opts._.length !== 0) {
	let arr = [article.title,
		   html2text(article.summary),
		   html2text(article.description),
		   article.author.name].filter( val => val)
	// using only 1st non-option CL argument as a pattern
	let term = Array.isArray(opts._) ? opts._[0] : opts._
	if (!category_match(term, arr))
	    return false
    }

    return true
}

export class GrepError extends Error {
    constructor(msg) {
	super(msg)
	this.name = GrepError.name
	if (Error.captureStackTrace)
	    Error.captureStackTrace(this, GrepError)
    }
}

let is_date = function(date) { return !isNaN(date) }

export function date_match(pattern, src) {
    if (!pattern) return true
    if (!is_date(src)) return false

    let pair = pattern.split(",")

    if (pair[0][0] === "-") {
	let date = new Date(pair[0].slice(1))
	if (!is_date(date)) throw new GrepError("invalid date pattern")
	return (src <= date)
    }

    if (pair.length === 1) {
	let date = new Date(pair[0])
	if (!is_date(date)) throw new GrepError("invalid date pattern")
	return (src >= date)
    }

    let d1 = new Date(pair[0])
    let d2 = new Date(pair[1])
    if (![d1, d2].every( val => is_date(val)))
	throw new GrepError("invalid date pattern")
    if (d1 > d2) throw new GrepError("invalid date pattern")
    return (d1 <= src && src <= d2)
}

export function category_match(pattern, src) {
    if (!pattern) return true
    if (!src) return false

    let re = new RegExp(pattern, "i")
    return src.some( val => val.match(re))
}

export class Grep extends stream.Transform {
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
	this._meta = this._meta || metadata(input.meta)
	if (this.opts.m) {	// extract only meta
	    this.log('-m')
	    this.push_meta()
	    done()
	    this.stop()
	    return
	}

	let item = article(input, ++this.articles_counter, this._meta)
	if (this.opts.n && this.articles_matched >= this.opts.n) {
	    this.log('-n', this.articles_counter)
	    done()
	    this.stop()
	    return
	}

	// by default `expect` is true, unless we have -v CLO
	if (article_match(item, this.opts) === this.expect) {
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
