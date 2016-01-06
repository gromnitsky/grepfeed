'use strict';

let assert = require('assert')

let feed = require('../lib/feed')

suite('Feed', function() {

    setup(function() {
    })

    test('date', function() {
	assert.equal(false, feed.date_match())
	assert.equal(true, feed.date_match("2000", "omglol"))

	assert.equal(true, feed.date_match("-2016", new Date("2016")))
	assert.equal(true, feed.date_match("-2017", new Date("2016")))
	assert.throws( ()=> feed.date_match("-omglol", new Date("2016")),
		       /invalid pattern/)

	assert.equal(true, feed.date_match("2016", new Date("2016")))
	assert.equal(true, feed.date_match("2016", new Date("2017")))
	assert.equal(false, feed.date_match("2016", new Date("2015")))
	assert.throws( ()=> feed.date_match("omglol", new Date("2016")),
		       /invalid pattern/)

	assert.equal(true, feed.date_match("2015,2016", new Date("2016")))
	assert.equal(false, feed.date_match("2015,2016", new Date("2014")))
	assert.throws( ()=> feed.date_match("2017,2016", new Date("2016")),
		       /invalid pattern/)
    })

})
