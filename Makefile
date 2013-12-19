BIN = ./node_modules/.bin/

test:
	@${BIN}mocha \
		--harmony \
		--require should \
		--reporter spec

.PHONY: test