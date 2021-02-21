// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/IERC20Extended.sol";


/**
 * @title Erc20ExtendedToken
 * @notice The basic ERC20 implementation extended with the following:
 * - `increaseAllowance` and `decreaseAllowance` functions added
 * - `transferFrom` function supports "unlimited approval"
 */
contract Erc20ExtendedToken is IERC20Extended {
    using SafeMath for uint256;

    uint256 internal constant UNLIMITED_APPROVAL = uint256(-1);

    mapping (address => uint256) private _balances;

    mapping (address => mapping (address => uint256)) private _allowances;

    uint256 private _totalSupply;

    /// @inheritdoc IERC20
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    /// @inheritdoc IERC20
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    /// @inheritdoc IERC20
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), to, amount);
        return true;
    }

    /// @inheritdoc IERC20
    function allowance(address holder, address spender) public view virtual override returns (uint256) {
        return _allowances[holder][spender];
    }

    /// @inheritdoc IERC20
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /// @inheritdoc IERC20
    /// @dev It works in a slightly different way than the generic `transferFrom`:
    /// if the user approves an address for the max uint256 value, that address has unlimited approval (until reset).
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        require(from != address(0), "ERC20: transfer from zero address");
        address spender = _msgSender();
        uint256 allowed = _allowances[from][spender];

        if (allowed != UNLIMITED_APPROVAL) {
            uint256 newAllowance = _decreasedAllowance(allowed, amount);
            _allowances[from][spender] = newAllowance;
            emit Approval(from, spender, newAllowance);
        }
        _transfer(from, to, amount);
        return true;
    }

    /// @inheritdoc IERC20Extended
    function increaseAllowance(address spender, uint256 addedAmount) public virtual override returns (bool) {
        address holder = _msgSender();
        uint256 allowed = _allowances[holder][spender];
        _approve(holder, spender, allowed.add(addedAmount));
        return true;
    }

    /// @inheritdoc IERC20Extended
    function decreaseAllowance(address spender, uint256 subtractedAmount) public virtual override returns (bool) {
        address holder = _msgSender();
        uint256 allowed = _allowances[holder][spender];
        _approve(holder, spender, _decreasedAllowance(allowed, subtractedAmount));
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal virtual {
        require(to != address(0), "ERC20: transfer to zero address");
        _beforeTokenTransfer(from, to, amount);
        _balances[from] = _balances[from].sub(amount, "ERC20: amount exceeds balance");
        _balances[to] = _balances[to].add(amount);
        emit Transfer(from, to, amount);
        _afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal virtual {
        require(to != address(0), "ERC20: mint to zero address");
        _beforeTokenTransfer(address(0), to, amount);
        _totalSupply = _totalSupply.add(amount);
        _balances[to] = _balances[to].add(amount);
        emit Transfer(address(0), to, amount);
        _afterTokenTransfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal virtual {
        _beforeTokenTransfer(from, address(0), amount);
        _balances[from] = _balances[from].sub(amount);
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(from, address(0), amount);
        _afterTokenTransfer(from, address(0), amount);
    }

    function _approve(address holder, address spender, uint256 amount) internal virtual {
        require(spender != address(0), "ERC20: approve to zero address");
        require(holder != address(0), "ERC20: approve from zero address");
        _allowances[holder][spender] = amount;
        emit Approval(holder, spender, amount);
    }

    /// @dev Hook called before any transfer of tokens (it includes minting and burning)
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual {
        // solhint-disable-previous-line no-empty-blocks
    }

    /// @dev Hook called after any transfer of tokens (it includes minting and burning)
    function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual {
        // solhint-disable-previous-line no-empty-blocks
    }

    function _msgSender() internal view virtual returns (address payable) {
        return msg.sender;
    }

    function _decreasedAllowance(uint256 allowed, uint256 decrease) private pure returns (uint256) {
        return allowed.sub(decrease, "ERC20: allowance exceeded");
    }
}
