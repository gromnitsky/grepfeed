# Grepfeed

Filters out rss/atom feeds. Returns articles matching a pattern. The
output is another valid xml feed.

## What's included

* a cli util `grepfeed.js`;
* a standalone http server that shares the same engine w/ the cli util.
* a web client that uses the included server as an intermediary and
  acts as a gui version of the cli util.

## Requirements

* node >= 14.17.6
* GNU make

## Setup

* cli/server

        $ npm i grepfeed

    or manually after cloning the repo:

    ~~~
    $ NODE_ENV=production npm i
    ~~~

* web client, that isn't included in the npm pkg

    ~~~
    $ npm i
    $ make
    ~~~

## How it works

`lib/feed.js` contains all the code that parses & transforms xml
feeds. Its core is `Grep` class--a Transform stream:

    readable_stream.pipe(<our filter>).pipe(writable_stream)

### cli

`cli/grepfeed` extends `Grep` to override several methods where it's
convenient to write the output in any format one wants. 3 interfaces
are included: text-only (the default), json, xml. The latter produces
a valid rss 2.0 feed. E.g.

    $ curl http://example.com/rss | cli/grepfeed.js apple -d=2016 -x

parses the input feed, selects only articles written in 2016 or newer
that match the regexp pattern `/apple/`. `-x` means xml output.

~~~
Usage: grepfeed.js [opt] [PATTERN] < xml

  -e      print only articles w/ enclosures
  -n NUM  number of articles to print
  -x      xml output
  -j      json output
  -m      print only meta
  -V      program version

Filter by:

  -d      [-]date[,date]
  -c      categories

Or/and search for a regexp PATTERN in each rss article & print the
matching ones. The internal order of the search: title, summary,
description, author.

  -v      invert match
~~~

### server

Acts as a proxy: downloads a requested feed & returns the filtered
xml. Query params match `cli/grepfeed.js` command line interface. To
start a server, run

    $ server/index.js .

(To select a diff port, use `PORT` env var.)

This following example yields the same xml as in the `cli/grepfeed.js`
case, only does it through http:

    $ curl '127.0.0.1:3000/api/?_=apple&d=2016&url=http%3A%2F%2Fexample.com%2Frss'

Notice `d` means `-d` in the `cli/grepfeed.js` example, `-x` doesn't make
sense here, `_` means the 1st command line arg, `apple` in this
case. The server doesn't invoke `cli/grepfeed.js` program; they both use
minimist to parse command options, thus the perceived similarity in
the behaviour.

### web client

A web client is a simple React app (chrome/ff only) that internally
talks to the above server. If you have built the web client, pass to
the server the dir w/ the compiled client files:

    $ server/index.js _out

& open http://127.0.0.1:3000 in a browser.

# License

MIT.

Have fun!
