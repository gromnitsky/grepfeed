# Grepfeed

Filters out rss/atom feeds. Returns all articles in a feed that match
any of input patterns. The output is another valid xml feed.

## What is included

* a cli util `grepfeed`;
* a standalone http server that shares the same engine w/ the cli util.
* a web client that uses the included server as an intermediary and
  acts as a gui version of the cli util.

## Requirements

* node 5.4.1
* GNU make

## Compilation

### cli/server

None is required. Run `npm install` to get all the deps.

### web client

0. Clone the repo

1. chdir to some tmp loc

2. Run

		$ NODE_ENV=production make -f ../path/to/the/repo compile

## How it works

`lib/feed.js` contains all the code that parses & transforms xml
feeds. Its core is `Grep` class--a Transform stream that allows to be
used as:

	readable_stream.pipe(<our filter>).pipe(writable_stream)

### cli

`cli/grepfeed` extends Grep to override 2 methods: `print_meta()` &
`print_atricle()` where it's convenient to write the output in any
format one wants. 2 interfaces are included: the default text-only &
an xml one. The latter produces a valid rss 2.0 feed. E.g.

	$ curl http://example.com/rss | cli/grepfeed apple -d=2016 -x

parses the input feed, selects only articles written in 2016 or newer
that match the regexp pattern /apple/. `-x` means xml output.

Look in the beginning of `cli/grepfeed` file for additional options.

### server

Acts as a proxy: downloads a requested feed & returns the filtered
xml. Query params match `cli/grepfeed` command line interface. To
start a server, run

	$ server/index .

(To select a diff host/port, use `HOSTNAME` & `PORT` env vars.)

This returns the same xml as in the `cli/grepfeed` example, only does
it through http:

	$ curl '192.168.8.128:3000/api/?_=apple&d=2016&url=http%3A%2F%2Fexample.com%2Frss'

Notice `d` means `-d` in the `cli/grepfeed` example, `-x` doesn't
apply here & `_` means the 1st command line arg, `apple` in this
case. The server doesn't invoke `cli/grepfeed` program; they both use
minimist to parse option arguments, thus the perceived similarity in
the behavior.

### web client

A web client is a simple React SPA that internally talks to the above
server. If you indeed had build the web client, run the server w/ the
compiled files directory, as:

	$ NODE_PATH=node_modules HOSTNAME=127.0.0.1 ../grepfeed/server/index.js production/client

Then open http://127.0.0.1:3000 in your browser.

# License

MIT.

Have fun!
