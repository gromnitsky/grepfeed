'use strict';

require("babel-polyfill")

let React = require('react')
let ReactDOM = require('react-dom')
let minimist = require('minimist')

let feed = require('../lib/feed')

let grep = new feed.MyGrepXML({})

ReactDOM.render(
    React.createElement("span", null, 'Hello, world!'),
    document.getElementById('result-opts')
)
