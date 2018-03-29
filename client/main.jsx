'use strict';

/* global React, ReactDOM */

let shellquote = require('shell-quote')
let NProgress = require('nprogress')
let get = require('lodash.get')

let u = require('../lib/u')
let dom = require('../lib/dom')
let meta = require('../lib/package.json')

let argv_parse = function(filter) {
    let argv = u.opts_parse(shellquote.parse(filter || ''))
    let r = {}
    Object.keys(argv).filter(k => /^[endcv_]$/.test(k)).forEach(k => {
	let val = Array.isArray(argv[k]) ? argv[k][0] : argv[k]
	if (!val) return
	r[k] = val
    })
    return r
}

let Minimist = function(props) {
    return <p>argv: {JSON.stringify(argv_parse(props.argv), null, 2)}</p>
}

class GrepForm extends React.Component {
    constructor(props) {
	super(props)

	let uu = new URL(window.location.href)
	this.state = {
	    url: uu.searchParams.get('url') || '',
	    filter: uu.searchParams.get('filter') || '',
	}

	this.handleInputChange = this.handleInputChange.bind(this)
    }

    componentDidMount() {
	console.info("GrepForm#componentDidMount()")
	if (this.state.url && this.state.url.trim().length)
	    this.props.submit(null, this.state)
    }

    handleInputChange(evt) {
	let name = evt.target.name
	let val = evt.target.value
	this.update({
	    [name]: val
	})
    }

    update_href(url, filter) {
	let uu = new URL(window.location.origin)
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
	if (!this.props.busy) {
	    this.update({
		url: '',
		filter: ''
	    })
	}
	this.props.reset()
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
		  <summary>Filter:</summary>
		  <pre>{`  -e      get only articles w/ enclosures
  -n NUM  number of articles to get

Filter by:

  -d      [-]date[,date]
  -c      categories

Or/and search for a regexp PATTERN in each rss article & print the
matching ones. The internal order of the search: title, summary,
description, author.

-v      invert match`}</pre>
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

let RssClientURL = function(props) {
    return (
	<div className="rss_client_url">
	  <p>RSS client/podcatcher URL:</p>
	  <p><a href={props.url}>{props.url}</a></p>
	</div>
    )
}

let TableRows = function(props) {
    return Object.keys(props.data).map( (name, idx) => {
	let val = props.data[name]
	if (name === '#') return ''
	if (name === 'pubDate') {
	    val = new Date(val).toUTCString()
	} else if (name === 'link') {
	    val = <a href={val}>{val}</a>
	} else if (name === 'description') {
	    val = <span dangerouslySetInnerHTML={{__html: val}} />
	} else if (name === 'enclosures') {
	    let li = val.map( (enc, idx) => {
		return (
		    <li key={idx}>
		      <a href={enc.url}>{enc.url}</a> ({enc.type} {u.commas(enc.length)})
		    </li>
		)
	    })
	    val = <ul>{li}</ul>
	} else if (Array.isArray(val))
	    val = val.join(', ')

	return (
	    <tr key={idx}>
	      <td>{name}</td>
	      <td>{val}</td>
	    </tr>
	)
    })
}

let RssMeta = function(props) {
    return (
	<table className="meta">
	  <colgroup>
	    <col style={{width: '20%'}} />
	    <col style={{width: '80%'}} />
	  </colgroup>
	  <thead>
	    <th colSpan='2'>Metadata</th>
	  </thead>
	  <tr>
	    <td>matched articles</td>
	    <td>{props.matched_articles}</td>
	  </tr>

	  <TableRows data={props.data} />

	</table>
    )
}

let RssArticles = function(props) {
    return props.data.map( (article, idx) => {
	let up = idx === 0 ? '' : <a href={`#${idx-1}`}>⯅</a>
	let down = idx === props.data.length-1 ? '' : <a href={`#${idx+1}`}>⯆</a>
	return (
	    <table key={idx} className="article">
	      <colgroup>
		<col style={{width: '15%'}} />
		<col style={{width: '85%'}} />
	      </colgroup>
	      <thead>
		<th colSpan='2' id={idx}>{up} #{article['#']} {down}</th>
	      </thead>

	      <TableRows data={article} />

	    </table>
	)
    })
}

class Feed extends React.Component {
    hidden() { return this.props.data ? '' : 'hidden' }
    render() {
	return (
	    <div className={this.hidden()}>
	      <RssClientURL url={get(this.props.data, 'url')} />
	      <RssMeta matched_articles={get(this.props.data, 'json.articles.length', -1)}
		       data={get(this.props.data, 'json.meta', {})} />
	      <RssArticles data={get(this.props.data, 'json.articles', [])} />
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
	    feed: null
	}

	;['submit', 'reset'].forEach(fn => this[fn] = this[fn].bind(this))
	console.info('App')
    }

    is_busy() { return !!this.state.download }

    async submit(child_event, child_state) {
	console.info('App#submit()', child_state)
	if (child_event) child_event.preventDefault()
	let json
	try {
	    json = await this.download_feed(child_state.url, child_state.filter)
	} catch (err) {
	    // the error is reported by this.download_feed()
	    return
	}

	let uu = this.server_json_url(child_state.url, child_state.filter)
	uu.searchParams.delete('j')
	this.setState({
	    feed: {
		json,
		url: uu.toString()
	    }
	})
    }

    server_json_url(url, filter) {
	let uu = new URL(window.location.origin)
	uu.pathname = '/api'
	uu.searchParams.set('url', url)
	let argv = argv_parse(filter)
	Object.keys(argv).forEach(k => uu.searchParams.set(k, argv[k]))
	uu.searchParams.set('j', 1)
	return uu
    }

    download_feed(url, filter) {
	return new Promise( (resolve, reject) => {
	    let json_url = this.server_json_url(url, filter).toString()

	    this.setState({
		status: { value: "Loading...", type: 'info' },
		feed: null
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
	if (this.state.download) {
	    this.state.download.jqXHR.abort("user interrupt")
	} else {
	    this.setState({
		status: null,
		feed: null
	    })
	}
    }

    render() {
	return (
	    <div>
	      <GrepForm submit={this.submit}
			busy={this.is_busy()}
			reset={this.reset} />
	      <Status data={this.state.status} />
	      <Feed data={this.state.feed} />
	      <footer>
		<div>
		  <img src="moomintroll.svg"
		       alt="" title="A happy Moomintroll"/>
		</div>
		<div>
		  <a href="https://github.com/gromnitsky/grepfeed">Help</a>
		  <br/><br/>
		  v{meta.version}
		</div>
	      </footer>
	    </div>
	)
    }
}

ReactDOM.render(<App />, document.querySelector('#content'))
