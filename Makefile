.DELETE_ON_ERROR:

pp-%:
	@echo "$(strip $($*))" | tr ' ' \\n

mkf.dir := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))
out := $(or $(NODE_ENV),development)
src := $(mkf.dir)
src2dest = $(subst $(mkf.dir),$(out),$($1.src))



mocha := node_modules/.bin/mocha

.PHONY: test
test: node_modules
	$(mocha) -u tdd $(TEST_OPT) $(src)/test/test_*.js



export NODE_PATH = $(realpath node_modules)

node_modules: package.json
	npm install
	touch $@

package.json: $(mkf.dir)/package.json
	cp -a $< $@

.PHONY: npm
npm: node_modules



static.src := $(wildcard $(mkf.dir)/client/*.html $(mkf.dir)/client/*.svg)
static.dest :=  $(call src2dest,static)

$(static.dest): $(out)/%: $(mkf.dir)/%
	@mkdir -p $(dir $@)
	cp -a $< $@

.PHONY: static
static: $(static.dest)



node-sass := node_modules/.bin/node-sass
SASS_OPT := -q
sass.src := $(wildcard $(mkf.dir)/client/*.sass)
sass.dest := $(patsubst $(mkf.dir)/%.sass, $(out)/%.css, $(sass.src))

$(out)/client/%.css: $(mkf.dir)/client/%.sass
	@mkdir -p $(dir $@)
	$(node-sass) $(SASS_OPT) $< $@

$(sass.dest): node_modules

.PHONY: sass
sass: $(sass.dest)



.PHONY: compile
compile: static sass