'use strict';

let feed = require('./feed')

module.exports = class extends feed.Grep {
    header() { return "{\n" }
    footer() { return this.articles_matched ? "\n]\n}\n" : "\n}\n" }

    meta(data) {
	let r = {}
	for (let key in data) {
	    if (!this.is_printable(data[key]) || key.match(/^(itunes):/))
		continue
	    r[key] = data[key]
	}
	let tail = this.articles_matched ? ',\n "articles": [' : "\n"
	return '"meta": ' + JSON.stringify(r) + tail
    }

    article(obj) {
	let r = {}

	for (let key in obj) {
	    if (!this.is_printable(obj[key])) continue
	    if (key === "summary") continue // rss 2.0 doesn't have it
	    r[key] = obj[key]
	}

	return (this.articles_matched > 1 ? ',' : '') + "\n\n" + JSON.stringify(r)
    }
}
