const config = require('../../truffle-config');
config.compilers.solc.version = "0.7.6";
config.mocha = { };

module.exports = config;
