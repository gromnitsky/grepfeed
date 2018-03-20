'use strict';

let xml_encode = require('ent/encode')

let feed = require('./feed')

module.exports = class extends feed.Grep {
    header() {
	this.push("<?xml version='1.0' encoding='UTF-8'?>\n<rss version='2.0'>\n<channel>\n\n")
    }

    footer() { this.push("\n</channel>\n</rss>\n") }

    handle_error(err) {
	let msg = err.message
	if (this.opts.debug) msg += "\n" + err.stack
	this.log(msg)
    }

    to_s_rules(klass) {
	return {
	    "Array": function() { return this.join("\n") },
	    "Enclosure": function() {
		return `<enclosure url="${xml_encode(this.obj.url)}" type="${this.obj.type}" length="${this.obj.length}" />`
	    },
	    "Category": function() {
		return `<category>${xml_encode(this.data)}</category>`
	    }
	}[klass]
    }

    meta(data) {
	let r = []
	for (let key in data) {
	    if (!this.is_printable(data[key]) || key.match(/^(itunes):/))
		continue
	    this.to_s_set_rules(data[key])

	    if (key === "categories") {
		r.push(data[key].toString())
		continue
	    }
	    r.push(`<${key}>${xml_encode(data[key].toString())}</${key}>`)
	}
	r.push("")
	return r.join("\n")
    }

    article(obj) {
	let r = []

	r.push("\n<item>")
	for (let key in obj) {
	    if (!this.is_printable(obj[key])) continue

	    this.to_s_set_rules(obj[key])
	    let val = xml_encode(obj[key].toString())

	    if (key === "summary") continue // rss 2.0 doesn't have it
	    if (key.match(/^#$/)) {
		r.push(`<!-- ${key}: ${val} -->`)
		continue
	    }
	    if (key.match(/^(categories|enclosures)$/)) {
		r.push(obj[key].toString())
		continue
	    }

	    r.push(`<${key}>${val}</${key}>`)
	}

	r.push("</item>\n")
	return r.join("\n")
    }
}
