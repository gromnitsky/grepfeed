mocha := node_modules/.bin/mocha

.PHONY: test
test:
	$(mocha) -u tdd $(OPT) test/test_*.js
