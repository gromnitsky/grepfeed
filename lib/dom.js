'use strict';

// we use XMLHttpRequest() in fetch() stead, for we want to abort
// early & report a progress
exports.fetch = function(url, timeout = 2*60*1000 /* 2 min */) {
    let req = new XMLHttpRequest()
    req.timeout = timeout

    let promise = new Promise( (resolve, reject) => {
	req.open("GET", url)
	req.ontimeout = () => reject(new Error('timeout'))
	req.onerror = () => reject(new Error('xhr failed'))
	req.onabort = () => reject(new Error('user interrupt'))
	req.onload = () => {
	    if (req.status === 200)
		resolve(req.responseText)
	    else
		reject(new Error(`HTTP/${req.status} ${req.statusText || ''}`))
	}
	req.send()
    })

    return { req, promise }
}
