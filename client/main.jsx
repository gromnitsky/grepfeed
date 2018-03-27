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

    is_busy() { return this.props.mode === 'busy' }

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
	if (this.is_busy()) {
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
		     disabled={this.is_busy()} />
	      <label>
		<details>
		  <summary>Filter options:</summary>
		  TODO
		</details>
		<input name="filter" type="search" spellCheck="false"
		       value={this.state.filter}
		       onChange={this.handleInputChange}
		       disabled={this.is_busy()} />
	      </label>
	      <Minimist argv={this.state.filter} />
	      <p>
		<input type='submit' disabled={this.is_busy()} />&nbsp;
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
	    mode: 'normal',	// or 'busy'
	    status: null
	}

	;['submit', 'reset'].forEach(fn => this[fn] = this[fn].bind(this))
	console.info('App')
    }

    submit(child_event, child_state) {
	child_event.preventDefault()
	console.log('submit', child_state)
	this.setState({
	    mode: 'busy',
	    status: null
	})
    }

    reset(reason) {
	console.log('reset busy')
	if (reason === undefined) reason = {
	    value: new Error('user interrupt'),
	    type: 'error'
	}
	this.setState({
	    mode: 'normal',
	    status: reason
	})
    }

    render() {
	return (
	    <div>
	      <GrepForm submit={this.submit}
			mode={this.state.mode}
			reset={this.reset} />
	      <Status data={this.state.status} />
	    </div>
	)
    }
}

ReactDOM.render(<App />, document.querySelector('#content'))
