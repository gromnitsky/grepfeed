'use strict';

let html_ent_decode = require('ent/decode')

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

let keywords2array_or_null = function(str) {
    return array_or_null(str.split(",").map( (idx)=>idx.trim()))
}

exports.meta2arr = function(meta) {
    let r = []
    r.push({ "title": meta.title })
    r.push({ "link": meta.link })
    r.push({ "date": meta.date || meta.pubDate })
    r.push({ "author": meta.author })
    r.push({ "desc": meta.description && meta.description.replace(/\s+/g, ' ') })
    r.push({ "copyright": meta.copyright })
    r.push({ "ng": meta.language })
    r.push({ "generator": meta.generator })
    r.push({ "categories": array_or_null(meta.categories) })

    // itunes
    if (meta['#ns'].indexOf_object_key('xmlns:itunes') !== -1) {
	r.push({ "itunes:keywords": meta["itunes:keywords"] && keywords2array_or_null(meta["itunes:keywords"]["#"]) })
	r.push({ "itunes:explicit": meta["itunes:explicit"] && meta["itunes:explicit"]["#"] })

	let owner = (obj) => {
	    if (!obj) return ''
	    let name = obj["itunes:name"] ? obj["itunes:name"]["#"] : ""
	    let email = obj["itunes:email"] ? obj["itunes:email"]["#"] : ""
	    if (name === "") return email
	    return name + (email ? (" <"+email+">") : "")
	}
	r.push({ "itunes:owner": owner(meta["itunes:owner"]) })

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
	r.push({ "itunes:category": array_or_null(category_result) })
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
    let r = []
    r.push({ "#": count })
    r.push({ "guid": item.guid})
    r.push({ "title": item.title})
    r.push({ "date": item.date || item.pubDate })
    r.push({ "link": item.origlink || item.permalink || item.link })
    r.push({ "summary.__text": html2text(item.summary) })
    r.push({ "summary": item.summary })
    r.push({ "desc.__text": html2text(item.description) })
    r.push({ "desc": item.description })
    r.push({ "author": item.author })
    r.push({ "categories": array_or_null(item.categories) })
    r.push({ "enclosures":
	     array_or_null(item.enclosures.map( (idx) => { return idx.url }) )})

    return r
}

Array.prototype.find_by_object_key = function(str) {
    let idx = this.indexOf_object_key(str)
    if (idx === -1) return null
    return this[idx][str]
}

exports.article_match = function(article, opts) {
    let encl = article.find_by_object_key("enclosures")
    if (!encl && opts.e) return false

    if (opts.d) {
	let date = article.find_by_object_key("date")
	if (!exports.date_match(opts.d, date)) return false
    }

    if (opts.c) {
	let cat1 = article.find_by_object_key("categories")
	if (!exports.category_match(opts.c, cat1)) return false
    }

    if (opts._.length !== 0) {
	let title = article.find_by_object_key("title")
	let sum = article.find_by_object_key("summary.__text")
	let desc = article.find_by_object_key("desc.__text")
	let author = article.find_by_object_key("author")
	let arr = [title, sum, desc, author].map( (idx) => idx.trim())
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

// TODO: subclass Error
exports.date_match = function(pattern, src) {
    if (!pattern) return true
    if (pattern && !is_date(src)) return false

    let pair = pattern.split(",")

    if (pair[0][0] === "-") {
	let date = new Date(pair[0].slice(1))
	if (!is_date(date)) throw new Error("invalid pattern")
	return (src <= date)
    }

    if (pair.length === 1) {
	let date = new Date(pair[0])
	if (!is_date(date)) throw new Error("invalid pattern")
	return (src >= date)
    }

    let d1 = new Date(pair[0])
    let d2 = new Date(pair[1]);	// the semicolon here is important
    [d1, d2].forEach( (idx) => {
	if (!is_date(idx)) throw new Error("invalid pattern")
    })
    if (d1 > d2) throw new Error("invalid pattern")
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
