#!/usr/bin/env node
const { writeContent } = require('../../../scripts/shared/generateSol.lib');

writeContent `// Auto-generated by \`../scripts/generate-NetworkParams_sol.js\` (updates in this file will be lost).
// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

/// @dev Network-dependant params (i.e. addresses, block numbers, etc..)
contract NetworkParams {
    // Layer1 chain:  "${'layer1 chain'}"
    // Side-chain : "${'side-chain'}" 

    /*
    // == KingSwapRouter on the Side-chain:: constructor params ==
    // KingSwapFactory on the side-chain
    xKingSwapFactory = ${'xKingSwapFactory'};
    // WETH on the side-chain
    xWETH = ${'xWETH'};
    */
}
`([__dirname, '../contracts/NetworkParams.sol'])
