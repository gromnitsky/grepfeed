# Grepfeed

Filters out rss/atom feeds. Returns articles matching a pattern. The
output is another valid xml feed.

A live example: https://serene-river-17732.herokuapp.com/

## What's included

* a cli util `grepfeed`;
* a standalone http server that shares the same engine w/ the cli util.
* a web client that uses the included server as an intermediary and
  acts as a gui version of the cli util.

## Requirements

* node 8.10.0
* GNU make (for a web client only)

## Setup

* cli/server

        $ npm i

    No separate build step is required.

* web client

    ~~~
    $ npm -g i browserify babel-cli babel-preset-es2015 babel-preset-react node-sass uglifyjs
    $ make NODE_ENV=production
    ~~~

## How it works

`lib/feed.js` contains all the code that parses & transforms xml
feeds. Its core is `Grep` class--a Transform stream:

    readable_stream.pipe(<our filter>).pipe(writable_stream)

### cli

`cli/grepfeed` extends `Grep` to override several methods where it's
convenient to write the output in any format one wants. 2 interfaces
are included: a text-only (the default) & an xml one. The latter
produces a valid rss 2.0 feed. E.g.

    $ curl http://example.com/rss | cli/grepfeed apple -d=2016 -x

parses the input feed, selects only articles written in 2016 or newer
that match the regexp pattern `/apple/`. `-x` means xml output.

Look at the beginning of `cli/grepfeed` file for the additional
options.

### server

Acts as a proxy: downloads a requested feed & returns the filtered
xml. Query params match `cli/grepfeed` command line interface. To
start a server, run

    $ server/index .

(To select a diff port, use `PORT` env var.)

This following example yields the same xml as in the `cli/grepfeed`
case, only does it through http:

    $ curl '127.0.0.1:3000/api/?_=apple&d=2016&url=http%3A%2F%2Fexample.com%2Frss'

Notice `d` means `-d` in the `cli/grepfeed` example, `-x` doesn't make
sense here, `_` means the 1st command line arg, `apple` in this
case. The server doesn't invoke `cli/grepfeed` program; they both use
minimist to parse command options, thus the perceived similarity in
the behaviour.

### web client

A web client is a simple React app that internally talks to the above
server. If you have indeed built the web client, pass to the server
the dir w/ the compiled client files:

    $ server/index.js _out/production/client

& open http://127.0.0.1:3000 in a browser.

# License

MIT.

Have fun!
