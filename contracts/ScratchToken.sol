//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.4;

// Import this library to be able to use console.log
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./FoundersTimelock.sol";

contract ScratchToken is Context, IERC20, Ownable {

    using Address for address;

    uint256 private _totalSupply;
    uint256 private _maxTxAmount;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    mapping (address => bool) private _isExcludedFromFee;

    /// Distribution
    uint256 private _maxSupply;
    struct DistributionWallet {
        address wallet;
        uint256 distPercentage;
    }
    // Percentages (in 1/10,000)
    uint256 private _percentageRelativeTo = 10000;

    uint256 private _distBurnPercentage = 1500;
    uint256 private _distOperationsAndFounderPercentage = 1500; // TODO: What of this?
    uint256 private _distPreSalePercentage = 1000; // TODO: What of this?

    // Wallets
    DistributionWallet private _privateInvestmentWallet = DistributionWallet(address(0xE69AC38Cd6DA0eA9A540B47399C430131216ceD0), 500);
    DistributionWallet[5] private _foundersWallet;
    DistributionWallet private _exchangeWallet = DistributionWallet(address(0xE69Ac38cd6da0Ea9a540b47399C430131216CEd2), 500);
    address private _developmentWallet;
    address private _operationsWallet;
    address private _archaWallet;

    // Founders
    uint256 private _foundersCliffDuration = 30 days * 6; // 6 months
    uint256 private _foundersVestingPeriod = 30 days;
    uint8 private _foundersVestingDuration = 10; // Linear release 10 times every 30 days
    FoundersTimelock[5] public foundersTimelocks;
    event FounderLiquidityLocked (
        address wallet,
        address timelockContract,
        uint256 tokensAmount
    );
    // uint256 public _taxFee = 5;
    // uint256 private _previousTaxFee = _taxFee;
    
    // uint256 public _liquidityFee = 5;
    // uint256 private _previousLiquidityFee = _liquidityFee;
    
    // TODO: All wallets as parameters
    constructor (
        address founder1_,
        address founder2_,
        address founder3_,
        address founder4_,
        address founder5_,
        address developmentWallet_,
        address operationsWallet_,
        address archaWallet_
    ) {
        // TODO: Remove global storage variables
        // Review storage differences in ethereum (memory vs storage)
        
        // TODO: Setup Uniswap router
        // IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F);
        //  // Create a uniswap pair for this new token
        // uniswapV2Pair = IUniswapV2Factory(_uniswapV2Router.factory())
        //     .createPair(address(this), _uniswapV2Router.WETH());

        // // set the rest of the contract variables
        // uniswapV2Router = _uniswapV2Router;
        
        // Exclude owner and this contract from fee
        _isExcludedFromFee[owner()] = true;
        _isExcludedFromFee[address(this)] = true;

        // Define founders in constructor since memory to storage not yet supported.
        _foundersWallet[0] = DistributionWallet(address(founder1_), 250);
        _foundersWallet[1] = DistributionWallet(address(founder2_), 250);
        _foundersWallet[2] = DistributionWallet(address(founder3_), 125);
        _foundersWallet[3] = DistributionWallet(address(founder4_), 250);
        _foundersWallet[4] = DistributionWallet(address(founder5_), 175);

        /// Mint
        // 100 quadrillion tokens with 9 decimals
        _maxSupply = 100 * 10**15 * 10 ** decimals();
        _maxTxAmount = _maxSupply * 10 / 100; // Max 10% of total supply in one transaction
        /// Distribute
        // Burn
        // _burn(msg.sender, _getAmountToDistribute(_distBurnPercentage));
        // TODO: Private Investment Airdrops
        _mint(_privateInvestmentWallet.wallet, _getAmountToDistribute(_privateInvestmentWallet.distPercentage));
        // Founders
        for (uint256 index = 0; index < _foundersWallet.length; index++) {
            FoundersTimelock timelockContract = new FoundersTimelock(this, _foundersWallet[index].wallet, _foundersCliffDuration, _foundersVestingPeriod, _foundersVestingDuration);
            foundersTimelocks[index] = timelockContract;
            _isExcludedFromFee[address(timelockContract)] = true;
            _mint(address(timelockContract), _getAmountToDistribute(_foundersWallet[index].distPercentage));
            emit FounderLiquidityLocked(_foundersWallet[index].wallet, address(timelockContract), _getAmountToDistribute(_foundersWallet[index].distPercentage));
        }
        // Operations
        _operationsWallet = operationsWallet_;
        // Dev wallet
        _mint(developmentWallet_, _getAmountToDistribute(500));
        _developmentWallet = developmentWallet_;
        // Exchange
        _mint(_exchangeWallet.wallet, _getAmountToDistribute(_exchangeWallet.distPercentage));
        // Archa
        _archaWallet = archaWallet_;
        // TODO: Presale Airdrops

        // TODO: Available supply to pool
        
        // TODO: Remove once the rest of the tokens are distributed
        _mint(msg.sender, _maxSupply - totalSupply() - _getAmountToDistribute(_distBurnPercentage));
    }

    function _getAmountToDistribute(uint256 _distributionPercentage) private view returns (uint256) {
        return (_maxSupply * _distributionPercentage) / _percentageRelativeTo;
    }

    // Fees

    /**
     * @dev Moves `amount` of tokens from `sender` to `recipient`.
     *
     * This internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) private {

        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "ScratchToken: Transfer amount must be greater than zero");
        if(sender != owner() && recipient != owner())
            require(amount <= _maxTxAmount, "ScratchToken: Transfer amount exceeds the maxTxAmount.");

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        // below: liquidity

        // // is the token balance of this contract address over the min number of
        // // tokens that we need to initiate a swap + liquidity lock?
        // // also, don't get caught in a circular liquidity event.
        // // also, don't swap & liquify if sender is uniswap pair.
        // uint256 contractTokenBalance = balanceOf(address(this));
        
        // if(contractTokenBalance >= _maxTxAmount)
        // {
        //     contractTokenBalance = _maxTxAmount;
        // }
        
        // bool overMinTokenBalance = contractTokenBalance >= numTokensSellToAddToLiquidity;
        // if (
        //     overMinTokenBalance &&
        //     !inSwapAndLiquify &&
        //     from != uniswapV2Pair &&
        //     swapAndLiquifyEnabled
        // ) {
        //     contractTokenBalance = numTokensSellToAddToLiquidity;
        //     //add liquidity
        //     swapAndLiquify(contractTokenBalance);
        // }
        
        // Indicates if fee should be deducted from transfer
        bool takeFee = true;
        
        // If any account belongs to _isExcludedFromFee account then remove the fee
        if(_isExcludedFromFee[sender] || _isExcludedFromFee[recipient]){
            takeFee = false;
        }
        
        // Transfer amount, it will take tax, burn, liquidity fee
        _tokenTransfer(sender, recipient, amount, takeFee);
    }

    function _tokenTransfer(address sender, address recipient, uint256 amount, bool takeFee) private {
        uint256 amountMinusFees = amount;
        if (takeFee) {
            // TODO: Swap to Eth
            // Dev fee
            uint256 devFee = amount * 200 / _percentageRelativeTo;
            _balances[_developmentWallet] += devFee;
            emit Transfer(sender, _developmentWallet, devFee);
            // Liquity pool
            // TODO: Send to pool
            uint256 liquidityFee = amount * 200 / _percentageRelativeTo;
            // Ops
            uint256 opsFee = amount * 100 / _percentageRelativeTo;
            _balances[_operationsWallet] += opsFee;
            emit Transfer(sender, _operationsWallet, opsFee);
            // Archa
            uint256 archaFee = amount * 100 / _percentageRelativeTo;
            _balances[_archaWallet] += archaFee;
            emit Transfer(sender, _archaWallet, archaFee);
            // TODO: Dynamic tax
            // Final transfer amount
            uint256 totalFees = devFee + liquidityFee + opsFee + archaFee;
            require (amount > totalFees, "ScratchToken: Transfer fees exceeds transfer amount");
            amountMinusFees = amount - totalFees;
        } else {
            amountMinusFees = amount;
        }
        _balances[sender] -= amount;
        _balances[recipient] += amountMinusFees;
        emit Transfer(sender, recipient, amountMinusFees);
    }

    // ERC20

    /**
     * @dev Returns the name of the token.
     */
    function name() public pure virtual returns (string memory) {
        return "ScratchToken";
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public pure virtual returns (string memory) {
        return "SCRATCH";
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens in the contract
     * should be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public pure returns (uint8) {
        return 9;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev Max supply of the token, cannot be increased after deployment.
     */
    function maxSupply() public view returns (uint256) {
        return _maxSupply;
    }

    /**
     * @dev Max amount of tokens per transaction, cannot be increased after deployment.
     */
    function maxTransactionAmount() public view returns (uint256) {
        return _maxTxAmount;
    }

    // Transfer

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * Requirements:
     *
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for ``sender``'s tokens of at least
     * `amount`.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }
    
    
    // Allowance

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    // Mint & Burn

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
        }
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);
    }

}