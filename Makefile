.DELETE_ON_ERROR:

NODE_ENV ?= development
out := _out/$(NODE_ENV)
src.mkf := $(realpath $(lastword $(MAKEFILE_LIST)))
src := $(dir $(src.mkf))

src2dest = $(subst $(src),$(out),$($1.src))
mkdir = @mkdir -p $(dir $@)
copy = cp $< $@



.PHONY: test
test: node_modules
	mocha -u tdd $(opt) $(src)/test/test_*.js



node_modules: package.json
	npm i
	touch $@



static.src := $(wildcard $(src)/client/*.html $(src)/client/*.svg)
static.dest :=  $(call src2dest,static)

$(static.dest): $(out)/%: $(src)/%
	$(mkdir)
	$(copy)

.PHONY: static
static: $(static.dest)



SASS_OPT := -q --output-style compressed
ifeq ($(NODE_ENV), development)
SASS_OPT := -q --source-map true
endif
sass.src := $(wildcard $(src)/client/*.sass)
sass.dest := $(patsubst $(src)/%.sass, $(out)/%.css, $(sass.src))

$(out)/client/%.css: $(src)/client/%.sass
	$(mkdir)
	node-sass $(SASS_OPT) --include-path node_modules -o $(dir $@) $<

$(sass.dest): node_modules

.PHONY: sass
sass: $(sass.dest)



ifeq ($(NODE_ENV), development)
BABEL_OPT := -s inline
endif
js.src := $(wildcard $(src)/lib/*.js)
js.dest := $(patsubst $(src)/%.js, $(out)/%.js, $(js.src))
bp := $(shell npm -g root)/babel-preset

$(js.dest): node_modules

$(out)/%.js: $(src)/%.js
	$(mkdir)
	babel --presets $(bp)-es2015 $(BABEL_OPT) $< -o $@



jsx.src := $(wildcard $(src)/client/*.jsx)
jsx.dest := $(patsubst $(src)/%.jsx, $(out)/%.js, $(jsx.src))

$(jsx.dest): node_modules
# we use .jsx files only as input for browserify
.INTERMEDIATE: $(jsx.dest)

$(out)/client/%.js: $(src)/client/%.jsx
	$(mkdir)
	babel --presets $(bp)-es2015,$(bp)-react $(BABEL_OPT) $< -o $@



browserify.dest.sfx := .es5
ifeq ($(NODE_ENV), development)
browserify.dest.sfx := .js
BROWSERIFY_OPT := -d
endif

bundle1 := $(out)/client/main.browserify$(browserify.dest.sfx)
$(bundle1): $(out)/client/main.js $(js.dest)
	$(mkdir)
	browserify $(BROWSERIFY_OPT) $< -o $@

.PHONY: js
js:



# will be empty in development mode
es5.dest := $(patsubst %.es5, %.js, $(bundle1))

UGLIFYJS_OPT := --screw-ie8 -m -c
%.js: %.es5
	uglifyjs $(UGLIFYJS_OPT) -o $@ -- $<

ifneq ($(browserify.dest.sfx), .js)
js: $(es5.dest)
# we don't need .es5 files around
.INTERMEDIATE: $(bundle1)
else
js: $(bundle1)
endif



.PHONY: compile
compile: static sass js
