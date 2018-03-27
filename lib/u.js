'use strict';

let minimist = require('minimist')

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
