import minimist from 'minimist'
import parse5 from 'parse5'

// return a hash
export function opts_parse(arr) {
    if (!arr) return {}

    let raw = minimist(arr, {
	boolean: ['v', 'e', 'x', 'j', 'm', 'debug', 'h', 'help', 'V'],
	string: ['d', 'c', 'n']
    })

    // in [-n1, -n2, foo, bar], n would be 2, and _ would be "foo bar"
    return Object.keys(raw).reduce( (result, key) => {
        if (Array.isArray(raw[key])) {
            if (key === '_')
                result._ = raw[key].join` `
            else {
                let size = raw[key].length
                result[key] = size ? raw[key][size - 1] : raw[key][0]
            }
        } else {
            result[key] = raw[key]
        }
        return result
    }, {})
}

export function commas(s) {
    return s ? s.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") : s
}

export function html_sanitize(html) {
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
