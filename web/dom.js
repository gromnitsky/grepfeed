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

export function colourise(url) {
    let paint = (str, fg, bg) => {
        let span = document.createElement('span')
        span.style.color = fg
        span.style.backgroundColor = bg
        span.innerText = str
        return span.outerHTML
    }

    let u
    try {
        u = new URL(url)
    } catch (e) {
        return null
    }

    return [
        paint(u.origin, '#191919', '#b0e2ff'),
        paint(u.pathname, '#191919', '#ffd500'),
        paint('?', '#fffff0', '#191919'),
        Array.from(u.searchParams.entries()).map( param => {
            return [
                paint(param[0], '#191919', '#ffd500'),
                paint('=', '#191919', '#ffd500'),
                paint(encodeURIComponent(param[1]), '#191919', '#ebebeb'),
            ].join``
        }).join(paint('&', '#fffff0', '#191919'))
    ].join``
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
