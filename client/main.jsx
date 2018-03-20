'use strict';

let util = require('util')
let nodeurl = require('url')

let React = require('react')
let ReactDOM = require('react-dom')
let shellquote = require('shell-quote')
let xmlToJSON = require('xmltojson')
let NProgress = require('nprogress')

let u = require('../lib/u')
let dom = require('../lib/dom')

let FeedBox = React.createClass({
    getInitialState: function() {
	this.server_url_template = {
	    protocol: window.location.protocol,
	    hostname: window.location.hostname,
	    port: window.location.port === 80 ? null : window.location.port,
	    pathname: '/api'
	}
	return { url: '', filter: '',
		 last_req: null, feed: null, xmlurl: null, request: null }
    },

    url4server: function() {
	let obj = util._extend({
	    query: u.opts_parse(shellquote.parse(this.state.filter || ""))
	}, this.server_url_template)
	obj.query.url = this.state.url

	let query = {}
	for (let key in obj.query) {
	    if (obj.query[key]) query[key] = obj.query[key]
	}
	obj.query = query

	return nodeurl.format(obj)
    },

    url4browser: function() {
	let obj = util._extend({query: {}}, this.server_url_template)
	obj.pathname = null
	if (this.state.url) obj.query.url = this.state.url
	if (this.state.filter) obj.query.filter = this.state.filter
	return nodeurl.format(obj)
    },

    handle_feedForm: function(data) {
	this.setState(data, () => {
	    // update the url bar
	    window.history.replaceState(null, null, this.url4browser())
	})
    },

    handle_feedForm_submit: function() {
	console.log("FeedBox.handle_feedForm_submit")
	let xmlurl = this.url4server()
	this.setState({
	    last_req: "Loading...",
	    feed: null,
	    xmlurl: xmlurl
	})
	NProgress.start()
	let request = dom.http_get(xmlurl, 60*2*1000) // timeout in 2m
	this.setState({request: request})
	let req_state = null

	request.promise.then( (body, status, res) => {
	    dom.nprogress("yellow")
	    // parse xml
	    let feed = xmlToJSON.parseString(body)
	    if (!feed.rss[0].channel[0].item)
		throw new Error("no matched articles")
	    this.setState({ feed })
	    req_state = "OK"
	}).catch( (err) => {
	    req_state = dom.jqxhr2error(err)
	    this.setState({ feed: null })
	}).progress( (event) => {
	    let bytes = event.loaded.toString().commas()
	    this.setState({ last_req: `Loading... ${bytes} B` })
	}).finally( ()=> {
	    NProgress.done()
	    this.setState({
		request: null,
		last_req: req_state
	    })
	}).done()
    },

    handle_feedForm_reset: function() {
	this.state.request.jqXHR.abort("user interrupt")
    },

    submit_invoke: function() {
	let purl = nodeurl.parse(window.location.href, true)
	if (purl.query.url) {
	    this.setState({
		url: purl.query.url,
		filter: purl.query.filter
	    }, this.handle_feedForm_submit)
	}
    },

    componentDidMount: function() {
	console.info("FeedBox.componentDidMount()")
	// we don't need any "router" here, as we just can invoke
	// handle_feedForm_submit() if there is anything useful in
	// query params
	this.submit_invoke()
    },

    render: function() {
	return (
	    <div className="feedBox">
	      <FeedForm on_data_change={this.handle_feedForm}
			on_submit={this.handle_feedForm_submit}
			on_reset={this.handle_feedForm_reset}
			is_busy={this.state.request}
			filter={this.state.filter}
			url={this.state.url} />
	      <FeedArgv filter={this.state.filter} />
	      <FeedReq status={this.state.last_req} />
	      <FeedTable feed={this.state.feed} xmlurl={this.state.xmlurl} />
	    </div>
	)
    }
});

// hand all state issues over to the parent
let FeedForm = React.createClass({
    on_change_url: function(elm) {
	this.props.on_data_change({url: elm.target.value})
    },

    on_change_filter: function(elm) {
	this.props.on_data_change({filter: elm.target.value})
    },

    submit: function(elm) {
	elm.preventDefault()
	this.props.on_submit()
    },

    reset: function(elm) {
	elm.preventDefault()
	if (!this.props.is_busy) {
	    this.props.on_data_change({filter: '', url: ''})
	    return
	}
	this.props.on_reset()
    },

    render: function() {
	return (
	    <form className="feedForm" onSubmit={this.submit}
		  onReset={this.reset}>
	      <p><label>RSS URL:<br/>
		  <input type="url" spellCheck="false"
			 value={this.props.url}
			 placeholder="http://example.com/rss.xml"
			 onChange={this.on_change_url}
			 disabled={this.props.is_busy}
			 required
			 />
		</label>
	      </p>
	      <p>
		<label>Filter options: <code>
		    [-d [-]date[,date]] [-c regexp]
		    [-e] [-n digit] [-v] [regexp]
		  </code><br />
		  <input type="text" spellCheck="false"
			 value={this.props.filter}
			 onChange={this.on_change_filter}
			 disabled={this.props.is_busy}
			 />
		</label>
	      </p>
	      <p><input type="submit" disabled={this.props.is_busy} />&nbsp;
		<input type="reset" /></p>
	    </form>
	)
    }
});

// Visualize filter parsing
let FeedArgv = React.createClass({

    filter2argv: function(str) {
	let argv = u.opts_parse(shellquote.parse(str || ""))
	for (let key in argv) {
	    if (!key.match(/^[dcenv_]$/)) delete argv[key]
	}
	argv.regexp = argv['_'][0] || ""
	delete argv['_']
	return argv
    },

    render: function() {
	return (
	    <div className="feedArgv">
	      <b>ARGV: </b>
	      { util.inspect(this.filter2argv(this.props.filter), {depth: null }) }
	    </div>
	)
    }
})

let FeedReq = React.createClass({
    render: function() {
	if (!this.props.status) return null
	let className = "feedReq-loading"
	if (this.props.status instanceof Error) className = "feedReq-error"
	if (this.props.status === "OK") return null

	return (
	    <div className={className}>
	      <b>Request state: </b>
	      { this.props.status.toString() }
	    </div>
	)
    }
})

let FeedTable = React.createClass({
    componentWillReceiveProps: function(nextProps) {
	this.redraw = !(this.props.feed && this.props.xmlurl === nextProps.xmlurl)
    },

    shouldComponentUpdate: function(nextProps, nextState) {
	if (this.redraw === undefined) return true
	return this.redraw
    },

    render: function() {
	if (!this.props.feed) return null

	let meta = []
	let channel = this.props.feed.rss[0].channel[0]
	let items = this.props.feed.rss[0].channel[0].item

	let transform = function(arr) {
	    return arr.map( (idx) => idx._text )
	}

	channel["matched articles"] = [{_text: items.length}]

	for (let key in channel) {
	    if (key === "item") continue
	    meta.push(
		<tr key={key}>
		  <td>{key}</td>
		  <td>{transform(channel[key]).join(", ")}</td>
		</tr>
	    )
	}

	let articles = []
	for (let idx=0; idx < items.length; ++idx) {
	    articles.push(
		<FeedTableArticle key={idx} id={idx+1} article={items[idx]} />
	    )
	}

	return (
	    <div className="feedTable">
	      <div className="feedResUrl">
		A URL for your RSS reader or podcatcher:
		<pre>
		  <a href={this.props.xmlurl}>{this.props.xmlurl}</a>
		</pre>
	      </div>

	      <table className="feedTableMeta">
		<colgroup>
		  <col style={{width: '20%'}} />
		  <col style={{width: '80%'}} />
		</colgroup>
		<thead>
		  <tr><th colSpan="2">Metadata</th></tr>
		</thead>
		<tbody>
		  {meta}
		</tbody>
	      </table>

	      {articles}

	    </div>
	)
    }
})

let FeedTableArticle = React.createClass({
    render: function() {
	let transform = function(key, arr) {
	    if (key === "enclosure") {
		return arr.map( (idx) => {
		    return `<a href="${idx._attr.url._value}">${idx._attr.url._value}</a> (${idx._attr.type._value} ${idx._attr.length._value})`
		})
	    }
	    return arr.map( (idx) => idx._text )
	}

	let rows = []
	for (let key in this.props.article) {
	    rows.push(
		<tr key={key}>
		  <td>{key}</td>
		  <td> {
			transform(key, this.props.article[key])
			  .map( (val, idx) => {
			    if (idx > 0) val = ", " + val
			    return <span key={idx} dangerouslySetInnerHTML={{__html: val}} />
			})
		    } </td>
		</tr>
	    )
	}

	return (
	    <table className="feedTableArticle">
	      <colgroup>
		<col style={{width: '15%'}} />
		<col style={{width: '85%'}} />
	      </colgroup>
	      <thead>
		<tr><th colSpan="2">#{this.props.id}</th></tr>
	      </thead>
	      <tbody>
		{rows}
	      </tbody>
	    </table>
	)
    }
})


ReactDOM.render(
    <FeedBox />,
    document.getElementById('content'))
