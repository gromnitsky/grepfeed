import minimist from 'minimist'

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
