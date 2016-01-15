'use strict';

let minimist = require('minimist')

// return a hash
exports.opts_parse = function(arr) {
    if (!arr) return {}
    return minimist(arr,
		    { boolean: ['v', 'e', 'x', 'm', 'debug'],
		      string: ['d', 'c', 'n'] })
}
