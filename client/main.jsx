'use strict';

require("babel-polyfill")

let util = require('util')

let React = require('react')
let ReactDOM = require('react-dom')
let shellquote = require('shell-quote')

let u = require('../lib/u')

let FeedBox = React.createClass({
    getInitialState: function() {
	return { url: '', filter: '' }
    },

    handle_feedForm: function(filter) {
	this.setState({filter: filter})
	console.log("FeedBox:handle_feedForm", filter)
    },

    handle_feedForm_submit: function(data) {
	this.setState(data)
	console.log("FeedBox:handle_feedForm_submit", data)
    },

    render: function() {
	return (
	    <div className="feedBox">
	      <FeedForm on_data_change={this.handle_feedForm}
			on_data_sumbit={this.handle_feedForm_submit} />
	      <FeedArgv filter={this.state.filter} />
	    </div>
	)
    }
});

let FeedForm = React.createClass({
    getInitialState: function() {
	return { url: '', filter: '' }
    },

    on_change_url: function(elm) {
	this.setState({url: elm.target.value})
    },

    on_change_filter: function(elm) {
	// call the parent
	this.props.on_data_change(elm.target.value)
	this.setState({filter: elm.target.value})
    },

    submit: function(elm) {
	elm.preventDefault()
	this.props.on_data_sumbit({url: this.state.url,
				   filter: this.state.filter})
    },

    render: function() {
	return (
	    <form className="feedForm" onSubmit={this.submit}>
	      <p><label>RSS URL:<br/>
		  <input type="url"
			 placeholder="http://example.com/rss.xml"
			 value={this.state.url}
			 onChange={this.on_change_url}
			 required />
		</label>
	      </p>
	      <p>
		<label>Filter options: <code>
		    [-d [-]date[,date]] [-c regexp]
		    [-e] [-n digit] [-x] [-m] [regexp]
		  </code><br />
		  <input type="text" spellcheck="false"
			 value={this.state.filter}
			 onChange={this.on_change_filter}
			 />
		</label>
	      </p>
	      <p><input type="submit" />&nbsp;
		<input type="reset" /></p>
	    </form>
	)
    }
});

let FeedArgv = React.createClass({
    filter2argv: function(str) {
	return u.opts_parse(shellquote.parse(str))
    },

    render: function() {
	return (
	    <div className="feedArgv">
	      <b>ARGV: </b>
	      { util.inspect(this.filter2argv(this.props.filter), {depth: null }) }
	    </div>
	)
    }
});

ReactDOM.render(
    <FeedBox />,
    document.getElementById('content'))
