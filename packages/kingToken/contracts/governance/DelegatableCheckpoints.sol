// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/math/SafeMath.sol";


/***
 * @title DelegatableCheckpoints
 * @notice Extension of token features with snapshots and voting delegation
 */
abstract contract DelegatableCheckpoints {
    using SafeMath for uint256;

    // Based on the code:
    // https://github.com/compound-finance/compound-protocol/blob/master/contracts/Governance/Comp.sol

    /// @dev A record of each accounts delegate
    mapping (address => address) internal _delegates;

    /// @dev A checkpoint for marking number of votes from a given block
    struct Checkpoint {
        uint32 fromBlock;
        uint224 votes;
    }

    /// @notice A record of votes checkpoints for each account, by index (based on 1)
    mapping (address => mapping (uint32 => Checkpoint)) public checkpoints;

    /// @notice The number of checkpoints for each account
    mapping (address => uint32) public numCheckpoints;

    /// @notice An event thats emitted when an account changes its delegate
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);

    /// @notice An event thats emitted when a delegate account's vote balance changes
    event DelegateVotesChanged(address indexed delegate, uint previousBalance, uint newBalance);

    /**
     * @notice Returns `delegatee` of a given address
     * @param delegator The address to get delegatee for
     */
    function delegates(address delegator)
        external
        view
        returns (address)
    {
        return _delegates[delegator];
    }

   /**
    * @notice Delegate votes from `msg.sender` to `delegatee`
    * @param delegatee The address to delegate votes to
    */
    function delegate(address delegatee) external {
        return _delegate(msg.sender, delegatee);
    }

    /**
     * @notice Gets the current votes balance for `account`
     * @param account The address to get votes balance
     * @return The number of current votes for `account`
     */
    function getCurrentVotes(address account)
        external
        view
        returns (uint256)
    {
        uint32 nCheckpoints = numCheckpoints[account];
        return nCheckpoints > 0 ? checkpoints[account][nCheckpoints].votes : 0;
    }

    /**
     * @notice Determine the prior number of votes for an account as of a block number
     * @dev Block number must be a finalized block or else this function will revert to prevent misinformation.
     * @param account The address of the account to check
     * @param blockNumber The block number to get the vote balance at
     * @return The number of votes the account had as of the given block
     */
    function getPriorVotes(
        address account,
        uint blockNumber
    ) external view returns (uint256) {
        _revertInvalidInput(account, blockNumber);
        uint32 checkpointInd = _findCheckpointInd(account, blockNumber);

        return checkpointInd == 0 ? 0 : uint256(checkpoints[account][checkpointInd].votes);
    }

    /**
     * @notice Gas-optimized version of `getPriorVotes` -
     * it reads a checkpoint with the given index and, if no/irrelevant data found, than only it does binary search
     * @dev Call (off-chain) the `findCheckpoint` to get the checkpoint index
     * @param account The address of the account to check
     * @param blockNumber The block number to get the vote balance at
     * @param checkpointInd Index of the checkpoint to look first for the given block' data
     * @return The number of votes the account had as of the given block
     */
    function getPriorVotes(
        address account,
        uint blockNumber,
        uint32 checkpointInd
    ) external view returns (uint256) {
        _revertInvalidInput(account, blockNumber);

        if (checkpointInd > 0) {
            Checkpoint memory cp = checkpoints[account][checkpointInd];
            if (cp.fromBlock == blockNumber) {
                return uint256(cp.votes);
            }
            if (blockNumber > cp.fromBlock) {
                uint32 tillBlock = checkpoints[account][checkpointInd + 1].fromBlock;
                if (tillBlock == 0 || tillBlock > blockNumber) {
                    return uint256(cp.votes);
                }
            }
        }
        uint32 actualInd = _findCheckpointInd(account, blockNumber);

        return actualInd == 0 ? 0 : uint256(checkpoints[account][actualInd].votes);
    }

    /// @notice Returns the index of the checkpoint for the given account and block
    /// @dev Intended for off-chain use (by UI)
    function findCheckpoint(address account, uint256 blockNumber) external view returns (uint32 checkpointInd)
    {
        _revertInvalidInput(account, blockNumber);
        return _findCheckpointInd(account, blockNumber);
    }

    function _votesOf(address account) internal view virtual returns (uint256);

    function _findCheckpointInd(
        address account,
        uint blockNumber
    ) private view returns (uint32) {
        uint32 nCheckpoints = numCheckpoints[account];
        if (nCheckpoints == 0) return 0;

        // First check most recent checkpoint
        if (checkpoints[account][nCheckpoints].fromBlock <= blockNumber) {
            return nCheckpoints;
        }

        // Next check the first checkpoint
        if (checkpoints[account][1].fromBlock > blockNumber) {
            return 0;
        }

        uint32 lower = 1;
        uint32 upper = nCheckpoints;
        while (upper > lower) {
            uint32 center = upper - (upper - lower) / 2; // ceil, avoiding overflow
            Checkpoint memory cp = checkpoints[account][center];
            if (cp.fromBlock == blockNumber) {
                return center;
            } else if (cp.fromBlock < blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }
        return lower;
    }

    function _delegate(address delegator, address delegatee) internal {
        address currentDelegate = _delegates[delegator];
        uint256 delegatorBalance = _votesOf(delegator);
        _delegates[delegator] = delegatee;

        emit DelegateChanged(delegator, currentDelegate, delegatee);

        _moveDelegates(currentDelegate, delegatee, delegatorBalance);
    }

    function _moveDelegates(address srcRep, address dstRep, uint256 amount) internal {
        if (srcRep != dstRep && amount > 0) {
            if (srcRep != address(0)) {
                // decrease old representative
                uint32 srcRepNum = numCheckpoints[srcRep];
                uint256 srcRepOld = srcRepNum > 0 ? checkpoints[srcRep][srcRepNum - 1].votes : 0;
                uint256 srcRepNew = srcRepOld.sub(amount);
                _writeCheckpoint(srcRep, srcRepNum, srcRepOld, srcRepNew);
            }

            if (dstRep != address(0)) {
                // increase new representative
                uint32 dstRepNum = numCheckpoints[dstRep];
                uint256 dstRepOld = dstRepNum > 0 ? checkpoints[dstRep][dstRepNum - 1].votes : 0;
                uint256 dstRepNew = dstRepOld.add(amount);
                _writeCheckpoint(dstRep, dstRepNum, dstRepOld, dstRepNew);
            }
        }
    }

    function _writeCheckpoint(
        address delegatee,
        uint32 nCheckpoints,
        uint256 oldVotes,
        uint256 newVotes
    )
        internal
    {
        uint32 blockNumber = safe32(block.number, "block number exceeds 32 bits");

        if (nCheckpoints > 0 && checkpoints[delegatee][nCheckpoints].fromBlock == blockNumber) {
            checkpoints[delegatee][nCheckpoints].votes = safe224(newVotes);
        } else {
            numCheckpoints[delegatee] = nCheckpoints + 1;
            checkpoints[delegatee][nCheckpoints] = Checkpoint(blockNumber, safe224(newVotes));
        }

        emit DelegateVotesChanged(delegatee, oldVotes, newVotes);
    }

    function safe32(uint n, string memory errorMessage) internal pure returns (uint32) {
        require(n < 2**32, errorMessage);
        return uint32(n);
    }

    function safe224(uint n) internal pure returns (uint224) {
        require(n < 2**224, "number exceeds 224 bits");
        return uint224(n);
    }

    function _revertInvalidInput(address account, uint blockNumber) private view {
        require(account != address(0), "zero account given");
        require(blockNumber != 0 && blockNumber < block.number, "invalid block given");
    }
}
