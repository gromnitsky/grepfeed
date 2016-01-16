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

    handle_feedForm: function(data) {
	this.setState(data)
	if (data.filter) console.log("FeedBox:handle_feedForm", data.filter)
    },

    handle_feedForm_submit: function() {
	console.log("FeedBox:handle_feedForm_submit", this.state)
    },

    render: function() {
	return (
	    <div className="feedBox">
	      <FeedForm on_data_change={this.handle_feedForm}
			on_submit={this.handle_feedForm_submit} />
	      <FeedArgv filter={this.state.filter} />
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

    reset: function() {
	this.props.on_data_change({filter: '', url: ''})
    },

    render: function() {
	return (
	    <form className="feedForm" onSubmit={this.submit}
		  onReset={this.reset}>
	      <p><label>RSS URL:<br/>
		  <input type="url"
			 placeholder="http://example.com/rss.xml"
			 onChange={this.on_change_url}
			 required />
		</label>
	      </p>
	      <p>
		<label>Filter options: <code>
		    [-d [-]date[,date]] [-c regexp]
		    [-e] [-n digit] [regexp]
		  </code><br />
		  <input type="text" spellCheck="false"
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
