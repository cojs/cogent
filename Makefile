BIN = ./node_modules/.bin/

test:
	@$(BIN)mocha \
		--harmony \
		--require should \
		--reporter spec

build:
	@mkdir -p build
	@$(BIN)regenerator \
		--include-runtime \
		lib/index.js > build/index.js

.PHONY: test build