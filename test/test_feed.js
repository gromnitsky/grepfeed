'use strict';

let assert = require('assert')

let feed = require('../lib/feed')

suite('Feed', function() {

    setup(function() {
    })

    test('date_match', function() {
	assert.equal(true, feed.date_match())
	assert.equal(false, feed.date_match("2000", "omglol"))
	assert.equal(false, feed.date_match("2000", null))

	assert.equal(true, feed.date_match("-2016", new Date("2016")))
	assert.equal(true, feed.date_match("-2017", new Date("2016")))
	assert.throws( ()=> feed.date_match("-omglol", new Date("2016")),
		       /invalid date pattern/)

	assert.equal(true, feed.date_match("2016", new Date("2016")))
	assert.equal(true, feed.date_match("2016", new Date("2017")))
	assert.equal(false, feed.date_match("2016", new Date("2015")))
	assert.throws( ()=> feed.date_match("omglol", new Date("2016")),
		       /invalid date pattern/)

	assert.equal(true, feed.date_match("2015,2016", new Date("2016")))
	assert.equal(false, feed.date_match("2015,2016", new Date("2014")))
	assert.throws( ()=> feed.date_match("2017,2016", new Date("2016")),
		       /invalid date pattern/)
    })

    test('category_match', function() {
	assert.equal(true, feed.category_match())
	assert.equal(false, feed.category_match("1", null))
	assert.equal(false, feed.category_match("1", []))
	assert.equal(true, feed.category_match(null, 1))

	assert.equal(false, feed.category_match("foo", []))
	assert.equal(true, feed.category_match("bar", ["foo", "bar"]))
    })

    test('article_match', function() {
	let a1 = {
	    pubDate: new Date("2000-01-02"),
	    title: "a1",
	    categories: ["foo"]
	}
	let a2 = {
	    pubDate: new Date("1999-01-02"),
	    title: "a2",
	    categories: ["foo", "bar"]
	}

	assert.equal(true, feed.article_match(a1, {}))
	assert.equal(true, feed.article_match(a1, {d: "2000", c: "foo"}))
	assert.equal(false, feed.article_match(a2, {d: "2000", c: "foo"}))
	assert.equal(true, feed.article_match(a2, {_: ["a2"]}))
	assert.equal(false, feed.article_match(a2, {d: "2000", _: ["a2"]}))
    })
})
