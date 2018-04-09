'use strict';

let minimist = require('minimist')
let parse5 = require('parse5')

// return a hash
exports.opts_parse = function(arr) {
    if (!arr) return {}
    return minimist(arr, {
	boolean: ['v', 'e', 'x', 'j', 'm', 'debug', 'h', 'help', 'V'],
	string: ['d', 'c', 'n']
    })
}

exports.commas = function(s) {
    return s ? s.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") : s
}

exports.html_sanitize = function(html) {
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

    let doc = parse5.parseFragment(html, { treeAdapter: adapter })
    return parse5.serialize(doc)
}
