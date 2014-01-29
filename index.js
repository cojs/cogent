try {
  module.exports = require('./lib');
} catch (err) {
  if (err.message !== 'Unexpected token *') throw err;
  if (!global.wrapGenerator) require('regenerator').runtime();
  module.exports = require('./build');
}