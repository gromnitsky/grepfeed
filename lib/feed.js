'use strict';

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
    r.push({ "categories": meta.categories && meta.categories.join(", ") })

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
	r.push({ "itunes:category": category_result.join(", ") })
    }

    return r
}
