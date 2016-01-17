.DELETE_ON_ERROR:

pp-%:
	@echo "$(strip $($*))" | tr ' ' \\n

out := $(or $(NODE_ENV),development)
src.mkf := $(realpath $(lastword $(MAKEFILE_LIST)))
src := $(dir $(src.mkf))
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
SASS_OPT := -q --output-style compressed
ifeq ($(out), development)
# embedded source maps don't work in chrome 47
SASS_OPT := -q --source-map true
endif
sass.src := $(wildcard $(src)/client/*.sass)
sass.dest := $(patsubst $(src)/%.sass, $(out)/%.css, $(sass.src))

$(out)/client/%.css: $(src)/client/%.sass
	$(mkdir)
	$(node-sass) $(SASS_OPT) --include-path node_modules -o $(dir $@) $<

$(sass.dest): node_modules

.PHONY: sass
sass: $(sass.dest)



babel := node_modules/.bin/babel
ifeq ($(out), development)
BABEL_OPT := -s inline
endif
js.src := $(wildcard $(src)/lib/*.js)
js.dest := $(patsubst $(src)/%.js, $(out)/%.js, $(js.src))

$(js.dest): node_modules

$(out)/%.js: $(src)/%.js
	$(mkdir)
	$(babel) --presets es2015 $(BABEL_OPT) $< -o $@



jsx.src := $(wildcard $(src)/client/*.jsx)
jsx.dest := $(patsubst $(src)/%.jsx, $(out)/%.js, $(jsx.src))

$(jsx.dest): node_modules
# we use .jsx files only as input for browserify
.INTERMEDIATE: $(jsx.dest)

$(out)/client/%.js: $(src)/client/%.jsx
	$(mkdir)
	$(babel) --presets es2015,react $(BABEL_OPT) $< -o $@



browserify := node_modules/.bin/browserify
browserify.dest.sfx := .es5
ifeq ($(out), development)
browserify.dest.sfx := .js
BROWSERIFY_OPT := -d
endif

bundle1 := $(out)/client/main.browserify$(browserify.dest.sfx)
$(bundle1): $(out)/client/main.js $(js.dest)
	$(mkdir)
	$(browserify) $(BROWSERIFY_OPT) $< -o $@

.PHONY: js
js:



# will be empty in development mode
es5.dest := $(patsubst %.es5, %.js, $(bundle1))

UGLIFYJS_OPT := --screw-ie8 -m -c
%.js: %.es5
	node_modules/.bin/uglifyjs $(UGLIFYJS_OPT) -o $@ -- $<

ifneq ($(browserify.dest.sfx), .js)
js: $(es5.dest)
# we don't need .es5 files around
.INTERMEDIATE: $(bundle1)
else
js: $(bundle1)
endif



.PHONY: compile
compile: static sass js



.PHONY: watch
watch:
	watchman trigger-del $(src) assets
	@mkdir -p $(out)
	m4 -D_SRC="$(src)" -D_TTY=`tty` \
		-D_OUT_PARENT=`pwd` \
		-D_MAKE="$(MAKE)" -D_MK="$(src.mkf)" \
		$(src)/mk/watchman.json | watchman -n -j
