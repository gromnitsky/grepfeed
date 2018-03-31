.DELETE_ON_ERROR:

NODE_ENV ?= development
out = _out/$(NODE_ENV)
cache := $(out)/.ccache

mkdir = @mkdir -p $(dir $@)
copy = cp $< $@

compile:
compile.all :=



.PHONY: test
test: node_modules
	mocha -u tdd $(t) test/test_*.js



package.json: package.cpp
	cpp -P $(if $(NPM),-D NPM) $< -o $@

include $(out)/.npm
$(out)/.npm: package.json
	npm i $(npm)
	$(mkdir)
	touch $@
	@echo Restarting Make...



static.dest := $(addprefix $(out)/, $(wildcard $(addprefix client/, *.html *.svg *.png)))
$(static.dest): $(out)/%: %
	$(mkdir)
	$(copy)

npm.src := babel-polyfill/dist/polyfill.min.js \
	react-dom/umd/react-dom.production.min.js \
	react/umd/react.production.min.js
npm.dest := $(addprefix $(out)/client/vendor/, $(npm.src))
$(out)/client/vendor/%: node_modules/%
	$(mkdir)
	$(copy)

compile.all += $(static.dest) $(npm.dest)



sass.opt := -q --output-style compressed
ifeq ($(NODE_ENV), development)
sass.opt := -q --source-map true
endif
sass.dest := $(patsubst %.sass, $(out)/%.css, $(wildcard client/*.sass))

$(out)/%.css: %.sass
	$(mkdir)
	node-sass $(sass.opt) --include-path node_modules -o $(dir $@) $<

compile.all += $(sass.dest)



ifeq ($(NODE_ENV), development)
babel.opt := -s inline
endif
bp := $(shell npm -g root)/babel-preset

js.dest := $(addprefix $(cache)/, $(wildcard lib/*.js))
$(js.dest): $(cache)/%: %
	$(mkdir)
	babel --presets $(bp)-es2015 $(babel.opt) $< -o $@

compile.all += $(js.dest)



jsx.dest := $(addprefix $(cache)/, $(wildcard client/*.jsx))
$(jsx.dest): $(cache)/%: %
	$(mkdir)
	babel --plugins babel-plugin-git-log-1 --presets $(bp)-react,$(bp)-env $(babel.opt) $< -o $@

compile.all += $(jsx.dest)



bundle.target := $(cache)/client/%.jsx.es5
ifeq ($(NODE_ENV), development)
browserify.opt := -d
bundle.target := $(out)/client/%.js
endif

$(bundle.target): $(cache)/client/%.jsx $(js.dest)
	$(mkdir)
	browserify $(browserify.opt) $< -o $@

# production
$(out)/client/%.js: $(cache)/client/%.jsx.es5 $(js.dest)
	uglifyjs $< -o $@ -mc --screw-ie8

compile.all += $(out)/client/main.js



$(compile.all): $(out)/.npm
compile: $(compile.all)



# $ watchthis.sound -e _out -- make server

.PHONY: server
server: kill compile
	server/index.js $(out)/client &

.PHONY: kill
kill:
	-pkill -f 'node server/index.js'



deploy:
	git checkout heroku
	git merge master
	rm -rf $(out) package.json
	$(MAKE)
	git add -f $(out)/client package.json
	-git commit -am build
	git push heroku heroku:master
	git checkout master

deploy: export NODE_ENV := production

# Before publishing to the npm reg, run `make npm-test`;
# if you agree w/ the output, run `make npm`.

pkg = $(shell json < package.json name version -a -d-).tgz
npm-test: npm-package.json
	npm pack
	@echo
	@tar tf $(pkg)
	@rm package.json
	$(if $(keep-tar),,@rm $(pkg))

npm-package.json:
	-rm package.json
	$(MAKE) NPM=1 package.json -o $(out)/.npm

npm: npm-package.json
	@echo
	@echo Upload $(pkg) to the registry? Ctrl-C to abort, RET to continue.
	@read
	npm publish
	rm package.json
