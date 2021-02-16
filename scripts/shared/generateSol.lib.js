/* global web3 */
const fs = require('fs');
const { join } = require('path');

module.exports = {
  content,
  getAddress,
  getNetworkAddresses,
  getNetworkAlias,
  panic,
  writeContent
};

function getNetworkAddresses(networkAlias = '') {
  return require(`./addresses.${networkAlias || getNetworkAlias()}`);
}

function getAddress(alias, addresses = getNetworkAddresses()) {
  return web3.utils.isAddress(addresses[alias])
      ? addresses[alias]
      : panic(`getAddress: invalid address (${alias})`);
}

function getNetworkAlias() {
  const i = process.argv.findIndex(e => e === '--network');
  if (i < 0 || i === process.argv.length - 1) panic('invalid or missing --network alias');
  return process.argv[i + 1];
}


function content(strings, ...keys) {
  return _content(strings, keys);
}

function writeContent(strings, ...keys) {
  return (path, dict) => {
    const fName = typeof path === "string"
      ? path
      : join(...path);
    fs.writeFileSync(fName, _content(strings, keys)(dict));
  }
}

function _content(strings, keys) {
  return (dict = {}) => {
    const networkAlias = getNetworkAlias();
    const values = Object.assign(
        { networkAlias },
        getNetworkAddresses(networkAlias),
        dict
    );
    let result = [strings[0]];
    keys.forEach(function(key, i) {
      result.push(values[key], strings[i + 1]);
    });
    return result.join('');
  };
}


function panic(msg) {
  console.error(msg);
  process.exit(-1);
}
