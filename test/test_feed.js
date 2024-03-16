import assert from 'assert'
import {execSync} from 'child_process'
import fs from 'fs'

import * as feed from '../lib/feed.js'

let __dirname = new URL('.', import.meta.url).pathname
let cli = `${__dirname}/../cli/grepfeed.js`
let datadir = `${__dirname}/data`

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
	assert.equal(false, feed.category_match("foo", ["bar", "baz"]))
    })

    test('article_match', function() {
	let a1 = {
	    pubDate: new Date("2000-01-02"),
	    title: "a1",
	    categories: ["foo"],
	    author: new feed.Author('bob@example.com')
	}
	let a2 = {
	    pubDate: new Date("1999-01-02"),
	    title: "a2",
	    categories: ["foo", "bar"],
	    author: new feed.Author('bob@example.com')
	}

	assert.equal(true, feed.article_match(a1, {}))
	assert.equal(true, feed.article_match(a1, {d: "2000", c: "foo"}))
	assert.equal(false, feed.article_match(a2, {d: "2000", c: "foo"}))
	assert.equal(true, feed.article_match(a2, {_: ["a2"]}))
	assert.equal(false, feed.article_match(a2, {d: "2000", _: ["a2"]}))
    })

    test('cli', function() {
	this.timeout(20000)
	let r = execSync(`${cli} -x < ${datadir}/back2work.xml | ${cli} -x | ${cli} -x | xmllint - | grep '^<!-- #' | wc -l`)
	assert.equal("252\n", r.toString())

	r = execSync(`${cli} '(apple|ios|itunes|iphone)' -v < ${datadir}/back2work.xml | grep '^#:' | wc -l`)
	assert.equal("147\n", r.toString())

	r = execSync(`${cli} -d=-2012 < ${datadir}/back2work.xml | grep '^#:' | wc -l`)
	assert.equal("47\n", r.toString())

	r = execSync(`${cli} -e < ${datadir}/irishhistorypodcast.xml | grep '^#:' | wc -l`)
	assert.equal("4\n", r.toString())

        r = execSync(`${cli} "^\\(tags:\\)" < ${datadir}/pocket.xml | grep '^#:' | wc -l`)
        assert.equal("43\n", r.toString())
    })

    test('cli-invalid-enclosure', function() {
        let r = execSync(`${cli} -j < ${datadir}/simple.xml "Red, Whine, & Blue" `)
        assert.deepEqual(JSON.parse(r).articles[0].enclosures[0], {
            length: 0,
            type: 'application/octet-stream',
            url: 'http://example.com/invalid-enclosure-url'
        })
    })

    test('cli-title-with-tag-name', function() {
        this.skip() // upstream feedparser's bug
        let r = execSync(`${cli} -j < ${datadir}/simple.xml "Red, Whine, & Blue" `)
        assert.equal(JSON.parse(r).articles[0].title, "Red, Whine, & Blue <a>!")
    })

    test('cli-no-empty-values', function() {
	let r = execSync(`${cli} -n1 < ${datadir}/pragprog.xml`)
	assert.equal(`title: Pragmatic Bookshelf
link: https://pragprog.com/
pubDate: Fri, 23 Mar 2018 10:04:55 GMT
managingEditor: rss@example.com
description: Up-to-date information about the Pragmatic Bookshelf
language: en-us

#: 1
guid: http://pragprog.com/news/adopting-elixir-from-concept-to-production-in-print?3840754
title: Adopting Elixir: From Concept to Production, in print
pubDate: Tue, 13 Mar 2018 19:40:30 GMT
link: http://pragprog.com/news/adopting-elixir-from-concept-to-production-in-print
author: rss@example.com (Pragmatic Bookshelf)
categories: news
`, r.toString())
    })

    test('html2text', function() {
	let html = fs.readFileSync(__dirname + '/data/chunk.html').toString()
	assert.equal(`Kotlin Kotlin with Android KTX val uri = Uri.parse(myUriString) val uri = myUriString. toUri () Getting Started To start using Android KTX in your Android Kotlin projects, add the following to your app module's build.gradle file: repositories { google() } dependencies { // Android KTX for framework API implementation 'androidx.core:core-ktx:0.1' ... }`, feed.html2text(html))
    })

    test('html_sanitize', function() {
	assert.equal(`
<title>omg</title>
hello
<p>world <b style="color: red"><i>!</i></b>!!</p>`, feed.html_sanitize(`
<head><title>omg</title></head>
hello
<p onclick="alert(1)"><script type="omg">1<heh>2</heh></script>world <b style="color: red"><i>!</i></b><style>css</style>!!</p>`))

    assert.equal('<p class="">q</p><a>w</a>',
                 feed.html_sanitize('<p class>q</p><a href="javascript:alert(1)">w</a>'))
    })
})
