const XKingToken = artifacts.require('XKingToken');
const {
  abi: proxyAbi,
  bytecode: proxyBytecode
} = require('@openzeppelin/upgrades-core/artifacts/AdminUpgradeabilityProxy');

module.exports = async function(deployer, network, [ owner ]) {

  const AdminUpgradeabilityProxy = new web3.eth.Contract(proxyAbi, { data: proxyBytecode });
  const tokenImpl = await XKingToken.new();
  let initializeCallBytes = web3.eth.abi.encodeFunctionCall(
      { name: 'initialize', type: 'function', inputs: [] },
      []
  );

  process.__userNamespace__.instances.xKingToken = await AdminUpgradeabilityProxy
      .deploy({ arguments: [ tokenImpl.address, owner, initializeCallBytes ] })
      .send({ from: owner, gas: 1000000 });
};
