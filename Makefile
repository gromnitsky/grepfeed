out = _out
all:

$(out)/%: client/%
	$(mkdir)
	$(copy)

$(out)/node_modules/%: node_modules/%
	$(mkdir)
	$(copy)

static.dest := $(patsubst client/%, $(out)/%, $(wildcard client/*)) \
	$(addprefix $(out)/, node_modules/react/umd/react.production.min.js \
		node_modules/react-dom/umd/react-dom.production.min.js \
		node_modules/nprogress/nprogress.js \
		node_modules/nprogress/nprogress.css)

all: $(static.dest)



define cjs-to-es
$(mkdir)
node_modules/.bin/rollup -p @rollup/plugin-commonjs -m -i $< -o $@
endef

$(out)/rollup/get.js: node_modules/lodash.get/index.js
	$(cjs-to-es)

$(out)/rollup/shellquote.js: node_modules/shell-quote/index.js
	$(cjs-to-es)

$(out)/rollup/u.js: lib/u.js
	node_modules/.bin/rollup -m -c -i $< -o $@

all: $(addprefix $(out)/rollup/, get.js shellquote.js u.js)



$(out)/main.js: client/main.jsx
	node_modules/.bin/babel -s true $< -o $@

all: $(out)/main.js



test: node_modules; mocha -u tdd $(t) test/test_*.js

# $ watchthis.sound -e _out -- make server
server: kill all; server/index.js $(out) &
kill:; -pkill -f 'node server/index.js'



REMOTE := sigwait
deploy:
	git checkout $(REMOTE)
	git merge master
	$(MAKE) npm=--production=false
	git add -f $(out)/client
	git commit -m build --allow-empty
	git push $(REMOTE) $(REMOTE):master
	git checkout master



mkdir = @mkdir -p $(dir $@)
copy = cp $< $@
.DELETE_ON_ERROR:
