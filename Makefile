BIN = ./node_modules/.bin/

test:
	@${BIN}mocha \
		--harmony-generators \
		--require should \
		--reporter spec

.PHONY: test