'use strict';

require("babel-polyfill")

let React = require('react')
let ReactDOM = require('react-dom')
let minimist = require('minimist')

//let feed = require('../lib/feed')

//let grep = new feed.MyGrepXML({})

ReactDOM.render(/*jshint ignore:start */
	<span>Hello, World!</span>,
    /*jshint ignore:end */ document.getElementById('result-opts'))

console.log("loaded")
