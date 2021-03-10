/* global web3 */

module.exports = {
  getDomainSeparator
}

function getDomainSeparator(name, contractAddress, chainId, version = `1`) {
  return web3.utils.keccak256(
      web3.eth.abi.encodeParameters(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            web3.utils.keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
            web3.utils.keccak256(name),
            web3.utils.keccak256(version),
            chainId,
            contractAddress
          ]
      )
  )
}
