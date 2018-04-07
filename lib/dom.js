'use strict';

// we use XMLHttpRequest() in fetch() stead, for we want to abort
// early & report a progress
exports.fetch = function(url, timeout = 2*60*1000 /* 2 min */) {
    let req = new XMLHttpRequest()
    let timedout = false
    let timer = setTimeout( () => {
	timedout = true
	req.abort()
    }, timeout)

    let promise = new Promise( (resolve, reject) => {
	req.open("GET", url)
	req.error = e => reject(e)
	req.onreadystatechange = () => {
	    if (req.readyState !== 4) return
	    if (timedout) {
		reject(new Error('timeout'))
		return
	    }
	    clearTimeout(timer)
	    switch (req.status) {
	    case 200:
		resolve(req.responseText)
		break;
	    case 0:
		reject(new Error('user interrupt'))
		break
	    default:
		reject(new Error(`HTTP/${req.status} ${req.statusText}`))
	    }
	}
	req.send()
    })

    return { req, promise }
}

exports.nprogress = function(colour) {
    let elm = document.querySelector("#nprogress .bar")
    if (elm) elm.style.backgroundColor = colour
}
