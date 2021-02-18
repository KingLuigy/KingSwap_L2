module.exports = function (deployer, network, [ owner ]) {
  console.log(`Skipped Migrations.sol deployment on ${deployer.network}`);

  process.__userNamespace__ = Object.assign(process.__userNamespace__ || {}, {
    instances: {},
    isDebug: !!process.env.DEBUG,
    isDevNet: !!network.match(/^(ksw|local|develop)$/),
    isTestnet: !!network.match(/^(kovan|sokol)$/),
    isMainnet: !!network.match(/^(mainnet|xdai)$/),
    network,
    owner,
  });
}
