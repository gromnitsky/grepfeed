out = dist
all:

$(out)/%: web/%
	$(mkdir)
	$(copy)

$(out)/node_modules/%: node_modules/%
	$(mkdir)
	$(copy)

static.dest := $(patsubst web/%, $(out)/%, $(wildcard web/*)) \
	$(addprefix $(out)/, node_modules/react/umd/react.production.min.js \
		node_modules/react-dom/umd/react-dom.production.min.js \
		node_modules/nprogress/nprogress.js \
		node_modules/nprogress/nprogress.css)

all: $(static.dest)



define cjs-to-es
$(mkdir)
node_modules/.bin/rollup -p @rollup/plugin-commonjs -m -i $< -o $@
endef

$(out)/rollup/shellwords.js: node_modules/shellwords-ts/dist/shellwords.js
	$(cjs-to-es)

$(out)/rollup/u.js: lib/u.js
	node_modules/.bin/rollup -m -c -i $< -o $@

all: $(addprefix $(out)/rollup/, shellwords.js u.js)



$(out)/main.js: web/main.jsx
	node_modules/.bin/babel --presets '@babel/preset-react' -s true $< -o $@

all: $(out)/main.js



.PHONY: test
test:; mocha -u tdd $(t) test/test_*.js

# $ watchthis.sound -e dist -- make server
server: kill all; server/index.js &
kill:; -pkill grepfeed-server



REMOTE := sigwait
BRANCH_LOCAL := master
deploy:
	git checkout $(BRANCH_LOCAL)
	git push $(REMOTE) $(BRANCH_LOCAL):master



mkdir = @mkdir -p $(dir $@)
copy = cp $< $@
.DELETE_ON_ERROR:
