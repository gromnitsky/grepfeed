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



include $(out)/.npm
$(out)/.npm: package.json
	npm i
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



js.dest := $(addprefix $(cache)/, $(wildcard lib/*.js))
$(js.dest): $(cache)/%: %
	$(mkdir)
	$(copy)

compile.all += $(js.dest)



ifeq ($(NODE_ENV), development)
babel.opt := -s inline
endif

jsx.dest := $(addprefix $(cache)/, $(wildcard client/*.jsx))
$(jsx.dest): $(cache)/%: %
	$(mkdir)
	node_modules/.bin/babel $(babel.opt) $< -o $@

$(jsx.dest): .babelrc
compile.all += $(jsx.dest)



bundle.target := $(cache)/client/%.jsx.es6
ifeq ($(NODE_ENV), development)
browserify.opt := -d
bundle.target := $(out)/client/%.js
endif

$(bundle.target): $(cache)/client/%.jsx $(js.dest)
	$(mkdir)
	browserify $(browserify.opt) $< -o $@

# production
$(out)/client/%.js: $(cache)/client/%.jsx.es6 $(js.dest)
	terser $< -o $@ -cm

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



REMOTE := sigwait
deploy:
	git checkout $(REMOTE)
	git merge master
	$(MAKE)
	git add -f $(out)/client
	git commit -m build
	git push $(REMOTE) $(REMOTE):master
	git checkout master

deploy: export NODE_ENV := production
