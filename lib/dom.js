'use strict';

let Q = require('q')
let $ = require('jquery')

exports.jqxhr2error = function(obj) {
    if (!obj) return new Error("unknown failure")
    if (obj instanceof Error) return obj
    return new Error(obj.status + ' ' + obj.statusText)
}

// timeout -- milliseconds
exports.http_get = function(url, timeout) {
    let deferred = Q.defer()

    let req = $.get({
	url: url,
	dataType: 'text',
	// screw jquery promises
	success: deferred.resolve,
	error: deferred.reject,
	xhrFields: {
	    onprogress: function(event) {
		deferred.notify(event)
	    }
	},
	timeout: timeout || 0
    })

    return {
	promise: deferred.promise,
	jqXHR: req
    }
}

exports.nprogress = function(colour) {
    let elm = document.querySelector("#nprogress .bar")
    if (elm) elm.style.backgroundColor = colour
}
