// we use XMLHttpRequest() in fetch() stead, for we want to abort
// early & report a progress
export function fetch(url, timeout = 2*60*1000 /* 2 min */) {
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

// from underscore.js 1.8.3
export function debounce(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
        var last = Date.now() - timestamp;

        if (last < wait && last >= 0) {
            timeout = setTimeout(later, wait - last);
        } else {
            timeout = null;
            if (!immediate) {
                result = func.apply(context, args);
                if (!timeout) context = args = null;
            }
        }
    };

    return function() {
        context = this;
        args = arguments;
        timestamp = Date.now();
        var callNow = immediate && !timeout;
        if (!timeout) timeout = setTimeout(later, wait);
        if (callNow) {
            result = func.apply(context, args);
            context = args = null;
        }

        return result;
    };
}
