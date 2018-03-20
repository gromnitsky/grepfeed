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
	mocha -u tdd $(t) test/test_*.js



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



ifeq ($(NODE_ENV), development)
browserify.opt := -d
endif

$(out)/client/%.js: $(cache)/client/%.jsx $(js.dest)
	$(mkdir)
	browserify $(browserify.opt) $< -o $@
ifneq ($(NODE_ENV), development)
	uglifyjs $@ -o $@.es5 -mc --screw-ie8
	mv $@.es5 $@
endif

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
	rm -rf _out
	$(MAKE) NODE_ENV=production
	git add -f _out/production/client
	-git commit -am build
	git push heroku heroku:master
