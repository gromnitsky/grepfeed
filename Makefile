.DELETE_ON_ERROR:

pp-%:
	@echo "$(strip $($*))" | tr ' ' \\n

out := $(or $(NODE_ENV),development)
src := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))
src2dest = $(subst $(src),$(out),$($1.src))
mkdir = @mkdir -p $(dir $@)



mocha := node_modules/.bin/mocha

.PHONY: test
test: node_modules
	$(mocha) -u tdd $(TEST_OPT) $(src)/test/test_*.js



export NODE_PATH = $(realpath node_modules)

node_modules: package.json
	npm install
	touch $@

package.json: $(src)/package.json
	cp -a $< $@

.PHONY: npm
npm: node_modules



static.src := $(wildcard $(src)/client/*.html $(src)/client/*.svg)
static.dest :=  $(call src2dest,static)

$(static.dest): $(out)/%: $(src)/%
	$(mkdir)
	cp -a $< $@

.PHONY: static
static: $(static.dest)



node-sass := node_modules/.bin/node-sass
SASS_OPT := -q
sass.src := $(wildcard $(src)/client/*.sass)
sass.dest := $(patsubst $(src)/%.sass, $(out)/%.css, $(sass.src))

$(out)/client/%.css: $(src)/client/%.sass
	$(mkdir)
	$(node-sass) $(SASS_OPT) $< $@

$(sass.dest): node_modules

.PHONY: sass
sass: $(sass.dest)



babel := node_modules/.bin/babel
js.src := $(wildcard $(src)/lib/*.js)
js.dest := $(patsubst $(src)/%.js, $(out)/%.js, $(js.src))

$(js.dest): node_modules

$(out)/%.js: $(src)/%.js
	$(mkdir)
	$(babel) --presets es2015 $(BABEL_OPT) $< -o $@



jsx.src := $(wildcard $(src)/client/*.jsx)
jsx.dest := $(patsubst $(src)/%.jsx, $(out)/%.js, $(jsx.src))

$(jsx.dest): node_modules
.INTERMEDIATE: $(jsx.dest)

$(out)/client/%.js: $(src)/client/%.jsx
	$(mkdir)
	$(babel) --presets es2015,react $(BABEL_OPT) $< -o $@



browserify := node_modules/.bin/browserify
$(out)/client/main.browserify.js: $(out)/client/main.js $(js.dest)
	$(mkdir)
	$(browserify) $(BROWSERIFY_OPT) $< -o $@

.PHONY: js
js: $(out)/client/main.browserify.js



.PHONY: compile
compile: static sass js
