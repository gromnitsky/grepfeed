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
	r.push({ "itunes:keywords": meta["itunes:keywords"] && meta["itunes:keywords"]["#"] })
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

// TODO:
// -d
// -c
// default
exports.article_match = function(article, opts) {
    let encl = article.find_by_object_key("enclosures")
    if (!encl && opts.e) return false

    return true
}
