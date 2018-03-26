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
	    filter: uu.searchParams.get('filter')
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
	this.update({
	    url: '',
	    filter: ''
	})
    }

    render() {
	return (
	    <form onSubmit={event => this.props.submit(event, this.state)}
	          onReset={event => this.handleReset(event)} >
	      <input type='url' placeholder='http://example.com/rss'
		     spellCheck="false"
		     name="url" value={this.state.url}
		     onChange={this.handleInputChange}/>
	      <label>
		<details>
		  <summary>Filter options:</summary>
		  TODO
		</details>
		<input name="filter" type="search" spellCheck="false"
		       value={this.state.filter}
		       onChange={this.handleInputChange} />
	      </label>
	      <Minimist argv={this.state.filter} />
	      <p>
		<input type='submit' />&nbsp;
		<input type='reset' />
	      </p>
	    </form>
	)
    }
}

class App extends React.Component {
    constructor() {
	super()
	this.state = {
	}
    }

    submit(child_event, child_state) {
	child_event.preventDefault()
	console.log('submit', child_state)
    }

    render() {
	return <GrepForm submit={this.submit} />
    }
}

ReactDOM.render(<App />, document.querySelector('#content'))
