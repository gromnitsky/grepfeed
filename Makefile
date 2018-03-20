.DELETE_ON_ERROR:

NODE_ENV ?= development
out := _out/$(NODE_ENV)
cache := $(out)/.ccache

mkdir = @mkdir -p $(dir $@)
copy = cp $< $@

compile:
compile.all :=



.PHONY: test
test: node_modules
	mocha -u tdd $(t) $(src)/test/test_*.js



include $(out)/.npm
$(out)/.npm: package.json
	npm i
	$(mkdir)
	touch $@
	@echo Restarting Make...



static.dest := $(addprefix $(out)/, $(wildcard client/*.html client/*.svg))
$(static.dest): $(out)/%: %
	$(mkdir)
	$(copy)

npm.src := babel-polyfill/dist/polyfill.min.js
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
	babel --presets $(bp)-es2015,$(bp)-react $(babel.opt) $< -o $@

compile.all += $(jsx.dest)



bundle.src.ext := jsx.es5
ifeq ($(NODE_ENV), development)
browserify.opt := -d
bundle.src.ext := jsx
endif

$(cache)/client/%.jsx.es5: $(cache)/client/%.jsx
	uglifyjs $< -o $@ -mc --screw-ie8

$(out)/client/%.js: $(cache)/client/%.$(bundle.src.ext) $(js.dest)
	$(mkdir)
	browserify $(browserify.opt) $< -o $@

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



deploy: compile
	[ '$(NODE_ENV)' = 'production' ] || exit 1
	git checkout heroku
	git commit -am build
	git push heroku heroku:master
