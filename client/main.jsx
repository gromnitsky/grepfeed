'use strict';

/* global React, ReactDOM */

let shellquote = require('shell-quote')
let NProgress = require('nprogress')

let u = require('../lib/u')
let dom = require('../lib/dom')

class Minimist extends React.Component {
    render() {
	return (
	    <p>
	      { JSON.stringify(this.props.argv) }
	    </p>
	)
    }
}

class GrepForm extends React.Component {
    constructor(props) {
	super(props)

	let uu = new URL(window.location.href)
	this.state = {
	    url: uu.searchParams.get('url'),
	    filter: uu.searchParams.get('filter'),
	}

	this.handleInputChange = this.handleInputChange.bind(this)
    }

    handleInputChange(evt) {
	let name = evt.target.name
	let val = evt.target.value
	this.update({
	    [name]: val
	})
    }

    update_href(url, filter) {
	let uu = new URL(window.location.href)
	uu.searchParams.set('url', url)
	uu.searchParams.set('filter', filter)
	window.history.replaceState(null, null, uu.toString())
    }

    update(state) {
	this.setState(state, () => {
	    this.update_href(this.state.url, this.state.filter)
	})
    }

    handleReset(evt) {
	evt.preventDefault()
	if (this.props.busy) {
	    this.props.reset()
	} else {
	    this.update({
		url: '',
		filter: ''
	    })
	}
    }

    render() {
	return (
	    <form onSubmit={event => this.props.submit(event, this.state)}
	          onReset={event => this.handleReset(event)} >
	      <input type='url' placeholder='http://example.com/rss'
		     spellCheck="false"
		     name="url" value={this.state.url}
		     onChange={this.handleInputChange}
		     disabled={this.props.busy}
		     required />
	      <label>
		<details>
		  <summary>Filter options:</summary>
		  TODO
		</details>
		<input name="filter" type="search" spellCheck="false"
		       value={this.state.filter}
		       onChange={this.handleInputChange}
		       disabled={this.props.busy} />
	      </label>
	      <Minimist argv={this.state.filter} />
	      <p>
		<input type='submit' disabled={this.props.busy} />&nbsp;
		<input type='reset' />
	      </p>
	    </form>
	)
    }
}

class Status extends React.Component {
    hidden() { return this.props.data ? '' : 'hidden'}
    type() { return this.props.data ? this.props.data.type : '' }

    render() {
	return (
	    <div className={`status ${this.type()} ${this.hidden()}`}>
	      {this.props.data ? this.props.data.value.toString() : ''}
	    </div>
	)
    }
}

class App extends React.Component {
    constructor() {
	super()
	this.state = {
	    status: null,
	    download: null,
	}

	;['submit', 'reset'].forEach(fn => this[fn] = this[fn].bind(this))
	console.info('App')
    }

    is_busy() { return !!this.state.download }

    async submit(child_event, child_state) {
	console.info('App#submit()', child_state)
	child_event.preventDefault()
	let json
	try {
	    json = await this.download_feed(child_state.url, child_state.filter)
	} catch (err) {
	    // the error is reported by this.download_feed()
	    return
	}
	console.log('start rendering json', json)
    }

    server_json_url(url, filter) {
	let uu = new URL(window.location.origin)
	uu.pathname = '/api'
	uu.searchParams.set('url', url)
	let argv = u.opts_parse(shellquote.parse(filter))
	Object.keys(argv).filter(k => /^[endc_]$/.test(k)).forEach(k => {
	    let val = argv[k]
	    if (Array.isArray(k)) val = val[0]
	    uu.searchParams.set(k, val)
	})
	uu.searchParams.set('j', 1)
	return uu
    }

    download_feed(url, filter) {
	return new Promise( (resolve, reject) => {
	    let json_url = this.server_json_url(url, filter).toString()

	    this.setState({
		status: { value: "Loading...", type: 'info' },
	    })
	    NProgress.start()
	    let req = dom.http_get(json_url, 60*2*1000) // 2m timeout
	    this.setState({ download: req })
	    let req_status

	    req.promise.then( body => {
		dom.nprogress("yellow")
		let json = JSON.parse(body)
		if (json.articles && json.articles.length) {
		    req_status = null // OK
		} else {
		    throw new Error('no matching articles')
		}
		resolve(json)
	    }).catch( err => {
		if ((err instanceof Error)) {
		    console.error(err)
		} else {
		    err = new Error(err.statusText)
		}
		req_status = { value: err, type: 'error' }
		reject(err)
	    }).progress( event => {
		let bytes = u.commas(event.loaded)
		this.setState({
		    status: {
			value: `Loading... ${bytes} B`,
			type: 'info'
		    }
		})
	    }).finally( ()=> {
		NProgress.done()
		this.setState({
		    download: null,
		    status: req_status
		})
	    }).done()
	})
    }

    reset() {
	console.info('App#reset()')
	if (this.state.download)
	    this.state.download.jqXHR.abort("user interrupt")
    }

    render() {
	return (
	    <div>
	      <GrepForm submit={this.submit}
			busy={this.is_busy()}
			reset={this.reset} />
	      <Status data={this.state.status} />
	    </div>
	)
    }
}

ReactDOM.render(<App />, document.querySelector('#content'))
