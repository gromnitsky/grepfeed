/*
  Preprocess it w/ `cpp -P` to generate 2 diff package.json files for:

  1) heroku deploys & for a normal use during development
  2) npm publish
*/
{
    "//": "DON'T EDIT! See package.cpp instead",
    "name": "grepfeed",
    "version": "0.0.4",
    "description": "Filters out rss/atom feeds. Returns articles matching a pattern. The output can be another valid xml feed.",
    "keywords": [
        "grep",
        "rss",
        "xml"
    ],
    "author": "Alexander Gromnitsky <alexander.gromnitsky@gmail.com>",
    "license": "MIT",
    "repository": "github:gromnitsky/grepfeed",
#ifndef NPM
    "engines": {
        "node": "8.10.0"
    },
    "scripts": {
        "start": "node server _out/production/client"
    },
#endif
    "dependencies": {
        "feedparser": "~2.2.9",
        "ent": "~2.2.0",
        "pump": "~3.0.0",
        "mime": "~2.2.0",
        "minimist": "~1.2.0",
        "request": "~2.85.0",
        "lodash.words": "~4.2.0"
    },
    // for heroku deploys we have a separate branch 'heroku', where
    // _out/production/client dir is added to the repo, thus
    // we need the pkgs below only for `make compile`
    "devDependencies": {
        "shell-quote": "~1.6.1",
        "jquery": "~3.3.1",
        "nprogress": "~0.2.0",
        "q": "~1.5.1",
        "react": "~16.2.0",
        "react-dom": "~16.2.0",
        "lodash.get": "~4.4.2",
        "babel-polyfill": "~6.26.0"
    },
    "files": [
        "cli/",
        "lib/",
        "!lib/dom.js",
        "server/"
    ],
    "bin": {
        "grepfeed": "cli/grepfeed",
        "grepfeed-server": "server/index.js"
    }
}
