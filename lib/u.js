'use strict';

let minimist = require('minimist')

// return a hash
exports.opts_parse = function(arr) {
    if (!arr) return {}
    return minimist(arr,
		    { boolean: ['v', 'e', 'x', 'm', 'debug'],
		      string: ['d', 'c', 'n'] })
}

String.prototype.commas = function() {
    return this.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")
}
