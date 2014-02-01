BIN = ./node_modules/.bin/
NODE ?= node

test:
	@$(NODE) $(BIN)mocha \
		--harmony \
		--require should \
		--reporter spec

.PHONY: test