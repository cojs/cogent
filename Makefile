BIN = ./node_modules/.bin/
SRC = $(shell find lib -name "*.js")
BUILD = $(subst lib,build,$(SRC))
NODE ?= node

build:
	@mkdir -p build
	@$(MAKE) $(BUILD)

build/%.js: lib/%.js
	@$(BIN)regenerator $< > $@

clean:
	@rm -rf build

test:
	@$(NODE) $(BIN)mocha \
		--harmony \
		--require should \
		--reporter spec

.PHONY: test build