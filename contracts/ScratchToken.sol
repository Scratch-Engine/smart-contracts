//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.4;

// Import this library to be able to use console.log
// import "hardhat/console.sol";

// Openzeppelin
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

// Uniswap
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./FoundersTimelock.sol";

contract ScratchToken is Context, IERC20, Ownable {

    using Address for address;

    // ERC20
    string private constant _NAME = "ScratchToken";
    string private constant _SYMBOL = "SCRATCH";
    uint8 private constant _DECIMALS = 9;
    uint256 private constant _MAX_SUPPLY = 100 * 10**15 * 10 ** _DECIMALS;
    address private constant _BURN_ADDRESS = 0x0000000000000000000000000000000000000000;
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // All percentages are relative to this value (1/10,000)
    uint256 private constant _PERCENTAGE_RELATIVE_TO = 10000;

    /// Distribution
    uint256 private constant _DIST_BURN_PERCENTAGE = 1850;
    uint256 private constant _DIST_FOUNDER1_PERCENTAGE = 250;
    uint256 private constant _DIST_FOUNDER2_PERCENTAGE = 250;
    uint256 private constant _DIST_FOUNDER3_PERCENTAGE = 250;
    uint256 private constant _DIST_FOUNDER4_PERCENTAGE = 250;
    uint256 private constant _DIST_FOUNDER5_PERCENTAGE = 250;
    uint256 private constant _DIST_EXCHANGE_PERCENTAGE = 750;
    uint256 private constant _DIST_DEV_PERCENTAGE = 500;
    uint256 private constant _DIST_OPS_PERCENTAGE = 150;

    // Founders TimeLock
    uint256 private constant _FOUNDERS_CLIFF_DURATION = 30 days * 6; // 6 months
    uint256 private constant _FOUNDERS_VESTING_PERIOD = 30 days; // Release every 30 days
    uint8 private constant _FOUNDERS_VESTING_DURATION = 10; // Linear release 10 times every 30 days
    mapping(address => FoundersTimelock) public foundersTimelocks;
    event FounderLiquidityLocked (
        address wallet,
        address timelockContract,
        uint256 tokensAmount
    );

    // Fees
    uint256 private constant _TAX_NORMAL_DEV_PERCENTAGE = 200;
    uint256 private constant _TAX_NORMAL_LIQUIDITY_PERCENTAGE = 200;
    uint256 private constant _TAX_NORMAL_OPS_PERCENTAGE = 100;
    uint256 private constant _TAX_NORMAL_ARCHA_PERCENTAGE = 100;
    uint256 private constant _TAX_EXTRA_LIQUIDITY_PERCENTAGE = 1000;
    uint256 private constant _TAX_EXTRA_BURN_PERCENTAGE = 500;
    uint256 private constant _TAX_EXTRA_DEV_PERCENTAGE = 500;
    uint256 private constant _TOKEN_STABILITY_PROTECTION_THRESHOLD_PERCENTAGE = 200;

    bool private _devFeeEnabled = true;
    bool private _opsFeeEnabled = true;
    bool private _liquidityFeeEnabled = true;
    bool private _archaFeeEnabled = true;
    bool private _burnFeeEnabled = true;
    bool private _tokenStabilityProtectionEnabled = true;

    mapping (address => bool) private _isExcludedFromFee;
    address private _developmentWallet;
    address private _operationsWallet;
    address private _archaWallet;
    // Accumulated unswaped tokens from fee
    uint256 private _devFeePendingSwap = 0;
    uint256 private _opsFeePendingSwap = 0;
    uint256 private _liquidityFeePendingSwap = 0;

    // Uniswap
    uint256 private constant _UNISWAP_DEADLINE_DELAY = 60; // in seconds
    IUniswapV2Router02 private _uniswapV2Router;
    IUniswapV2Pair private _uniswapV2Pair;
    address private _lpTokensWallet;
    bool private _inSwap = false; // Whether a previous call of swap process is still in process.
    bool private _swapAndLiquifyEnabled = true;
    uint256 private _minTokensBeforeSwapAndLiquify = 1 * 10 ** _DECIMALS;
    address private _liquidityWallet = 0x0000000000000000000000000000000000000000;

    // Prevent Swap Reentrancy.
    modifier lockTheSwap {
        require(!_inSwap, "Currently in swap.");
        _inSwap = true;
        _;
        _inSwap = false;
    }
    event SwapAndLiquify(
        uint256 tokensSwapped,
        uint256 ethReceived,
        uint256 tokensAddedToLiquidity
    );

    // To recieve ETH from uniswapV2Router when swaping
    receive() external payable {}
    
    constructor (
        address founder1Wallet_,
        address founder2Wallet_,
        address founder3Wallet_,
        address founder4Wallet_,
        address founder5Wallet_,
        address developmentWallet_,
        address exchangeWallet_,
        address operationsWallet_,
        address archaWallet_,
        address uniswapV2RouterAddress_
    ) {
        
        // Exclude addresses from fee
        _isExcludedFromFee[owner()] = true;
        _isExcludedFromFee[address(this)] = true;
        _isExcludedFromFee[_BURN_ADDRESS] = true;
        _isExcludedFromFee[founder1Wallet_] = true;
        _isExcludedFromFee[founder2Wallet_] = true;
        _isExcludedFromFee[founder3Wallet_] = true;
        _isExcludedFromFee[founder4Wallet_] = true;
        _isExcludedFromFee[founder5Wallet_] = true;
        _isExcludedFromFee[developmentWallet_] = true;
        _isExcludedFromFee[exchangeWallet_] = true;
        _isExcludedFromFee[operationsWallet_] = true;
        _isExcludedFromFee[archaWallet_] = true;

        /// Perform initial distribution 
        // Founders
        _lockFounderLiquidity(founder1Wallet_, _DIST_FOUNDER1_PERCENTAGE);
        _lockFounderLiquidity(founder2Wallet_, _DIST_FOUNDER2_PERCENTAGE);
        _lockFounderLiquidity(founder3Wallet_, _DIST_FOUNDER3_PERCENTAGE);
        _lockFounderLiquidity(founder4Wallet_, _DIST_FOUNDER4_PERCENTAGE);
        _lockFounderLiquidity(founder5Wallet_, _DIST_FOUNDER5_PERCENTAGE);
        // Exchange
        _mint(exchangeWallet_, _getAmountToDistribute(_DIST_EXCHANGE_PERCENTAGE));
        _lpTokensWallet = exchangeWallet_;
        // Dev
        _mint(developmentWallet_, _getAmountToDistribute(_DIST_DEV_PERCENTAGE));
        _developmentWallet = developmentWallet_;
        // Operations
        _mint(operationsWallet_, _getAmountToDistribute(_DIST_OPS_PERCENTAGE));
        _operationsWallet = operationsWallet_;
        // Archa (used later for taxes)
        _archaWallet = archaWallet_;
        // Burn
        uint256 burnAmount = _getAmountToDistribute(_DIST_BURN_PERCENTAGE);
        emit Transfer(address(0), _BURN_ADDRESS, burnAmount);
        // Send the rest minus burn to owner
        _mint(msg.sender, _MAX_SUPPLY - totalSupply() - burnAmount);

        // Initialize uniswap
        _initSwap(uniswapV2RouterAddress_);
    }

    // Constructor Internal Methods
    function _getAmountToDistribute(uint256 distributionPercentage) private pure returns (uint256) {
        return (_MAX_SUPPLY * distributionPercentage) / _PERCENTAGE_RELATIVE_TO;
    }

    function _lockFounderLiquidity(address wallet, uint256 distributionPercentage) internal {
        FoundersTimelock timelockContract = new FoundersTimelock(this, wallet, _FOUNDERS_CLIFF_DURATION, _FOUNDERS_VESTING_PERIOD, _FOUNDERS_VESTING_DURATION);
        foundersTimelocks[wallet] = timelockContract;
        _isExcludedFromFee[address(timelockContract)] = true;
        _mint(address(timelockContract), _getAmountToDistribute(distributionPercentage));
        emit FounderLiquidityLocked(wallet, address(timelockContract), _getAmountToDistribute(distributionPercentage));
    }

    // Public owner methods
    function isExcludedFromFees(address account) public view returns (bool) {
        return _isExcludedFromFee[account];
    }

    function excludeFromFees(address account, bool isExcluded) public onlyOwner {
        _isExcludedFromFee[account] = isExcluded;
    }
    /**
     * @dev Returns the address of the archa wallet.
     */
    function archaWallet() public view returns (address) {
        return _archaWallet;
    }
    /**
     * @dev Sets the address of the archa wallet.
     */
    function setArchaWallet(address newWallet) public onlyOwner {
        _archaWallet = newWallet;
    }

    /**
     * @dev Returns true if swap and liquify feature is enabled.
     */
    function swapAndLiquifyEnabled() public view returns (bool) {
        return _swapAndLiquifyEnabled;
    }

    /**
      * @dev Disables or enables the swap and liquify feature.
      */
    function enableSwapAndLiquify(bool isEnabled) public onlyOwner {
        _swapAndLiquifyEnabled = isEnabled;
    }

     /**
      * @dev Updates the minimum amount of tokens before triggering Swap and Liquify
      */
    function minTokensBeforeSwapAndLiquify() public view returns (uint256) {
        return _minTokensBeforeSwapAndLiquify;
    }

     /**
      * @dev Updates the minimum amount of tokens before triggering Swap and Liquify
      */
    function setMinTokensBeforeSwapAndLiquify(uint256 minTokens) public onlyOwner {
        require(minTokens < _totalSupply, "New value must be lower than total supply.");
        _minTokensBeforeSwapAndLiquify = minTokens;
    }
    /**
     * @dev Returns the address of the liquidity wallet, or 0 if not using it.
     */
    function liquidityWallet() public view returns (address) {
        return _liquidityWallet;
    }
    /**
     * @dev Sets the address of the liquidity wallet.
     */
    function setLiquidityWallet(address newWallet) public onlyOwner {
        _isExcludedFromFee[newWallet] = true;
        _liquidityWallet = newWallet;
    }

    /**
     * @dev Returns true if dev fee is enabled.
     */
    function devFeeEnabled() public view returns (bool) {
        return _devFeeEnabled;
    }

    /**
      * @dev Sets whether to collect or not the dev fee.
      */
    function enableDevFee(bool isEnabled) public onlyOwner {
        _devFeeEnabled = isEnabled;
    }

    /**
     * @dev Returns true if ops fee is enabled.
     */
    function opsFeeEnabled() public view returns (bool) {
        return _opsFeeEnabled;
    }

    /**
      * @dev Sets whether to collect or not the ops fee.
      */
    function enableOpsFee(bool isEnabled) public onlyOwner {
        _opsFeeEnabled = isEnabled;
    }

    /**
     * @dev Returns true if liquidity fee is enabled.
     */
    function liquidityFeeEnabled() public view returns (bool) {
        return _liquidityFeeEnabled;
    }

    /**
      * @dev Sets whether to collect or not the liquidity fee.
      */
    function enableLiquidityFee(bool isEnabled) public onlyOwner {
        _liquidityFeeEnabled = isEnabled;
    }

    /**
     * @dev Returns true if archa fee is enabled.
     */
    function archaFeeEnabled() public view returns (bool) {
        return _archaFeeEnabled;
    }

    /**
      * @dev Sets whether to collect or not the archa fee.
      */
    function enableArchaFee(bool isEnabled) public onlyOwner {
        _archaFeeEnabled = isEnabled;
    }

    /**
     * @dev Returns true if the burn fee is enabled.
     */
    function burnFeeEnabled() public view returns (bool) {
        return _burnFeeEnabled;
    }

    /**
      * @dev Sets whether to enable or not the burn fee.
      */
    function enableBurnFee(bool isEnabled) public onlyOwner {
        _burnFeeEnabled = isEnabled;
    }

    /**
     * @dev Returns true if token stability protection is enabled.
     */
    function tokenStabilityProtectionEnabled() public view returns (bool) {
        return _tokenStabilityProtectionEnabled;
    }

    /**
      * @dev Sets whether to enable the token stability protection.
      */
    function enableTokenStabilityProtection(bool isEnabled) public onlyOwner {
        _tokenStabilityProtectionEnabled = isEnabled;
    }

    // Fees
    /**
     * @dev Returns the amount of the dev fee tokens pending swap
     */
    function devFeePendingSwap() public onlyOwner view returns (uint256) {
        return _devFeePendingSwap;
    }
    /**
     * @dev Returns the amount of the ops fee tokens pending swap
     */
    function opsFeePendingSwap() public onlyOwner view returns (uint256) {
        return _opsFeePendingSwap;
    }
    /**
     * @dev Returns the amount of the liquidity fee tokens pending swap
     */
    function liquidityFeePendingSwap() public onlyOwner view returns (uint256) {
        return _liquidityFeePendingSwap;
    }

    // Uniswap
    function _initSwap(address routerAddress) private {
        // Setup Uniswap router
        _uniswapV2Router = IUniswapV2Router02(routerAddress);
         // Get uniswap pair for this token or create if needed
        address uniswapV2Pair_ = IUniswapV2Factory(_uniswapV2Router.factory())
            .getPair(address(this), _uniswapV2Router.WETH());

        if (uniswapV2Pair_ == address(0)) {
            uniswapV2Pair_ = IUniswapV2Factory(_uniswapV2Router.factory())
                .createPair(address(this), _uniswapV2Router.WETH());
        }
        _uniswapV2Pair = IUniswapV2Pair(uniswapV2Pair_);

        // Exclude from fee
        _isExcludedFromFee[address(_uniswapV2Router)] = true;
    }

    /**
     * @dev Returns the address of the Token<>WETH pair.
     */
    function uniswapV2Pair() public view returns (address) {
        return address(_uniswapV2Pair);
    }

    /**
     * @dev Swap `amount` tokens for ETH and send to `recipient`
     *
     * Emits {Transfer} event. From this contract to the token and WETH Pair.
     */
    function _swapTokensForEth(uint256 amount, address recipient) private lockTheSwap {
        // Generate the uniswap pair path of Token <> WETH
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = _uniswapV2Router.WETH();

        // Approve token transfer
        _approve(address(this), address(_uniswapV2Router), amount);

        // Make the swap
        _uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amount,
            0, // accept any amount of ETH
            path,
            recipient,
            block.timestamp + _UNISWAP_DEADLINE_DELAY
        );
    }
    
    /**
     * @dev Add `ethAmount` of ETH and `tokenAmount` of tokens to the LP.
     * Depends on the current rate for the pair between this token and WETH,
     * `ethAmount` and `tokenAmount` might not match perfectly. 
     * Dust(leftover) ETH or token will be refunded to this contract
     * (usually very small quantity).
     *
     */
    function _addLiquidity(uint256 ethAmount, uint256 tokenAmount) private {
        // Approve token transfer
        _approve(address(this), address(_uniswapV2Router), tokenAmount);

        // Add the ETH<>Token pair to the pool.
        _uniswapV2Router.addLiquidityETH {value: ethAmount} (
            address(this), 
            tokenAmount, 
            0, // amountTokenMin
            0, // amountETHMin
            _lpTokensWallet, // the receiver of the lp tokens
            block.timestamp + _UNISWAP_DEADLINE_DELAY
        );
    }
    // Swap and liquify
    /**
     * @dev Swap half of the amount token balance for ETH,
     * and pair it up with the other half to add to the
     * liquidity pool.
     *
     * Emits {SwapAndLiquify} event indicating the amount of tokens swapped to eth,
     * the amount of ETH added to the LP, and the amount of tokens added to the LP.
     */
    function _swapAndLiquify(uint256 amount) private {
        require(_swapAndLiquifyEnabled, "Swap And Liquify is disabled");
        // Split the contract balance into two halves.
        uint256 tokensToSwap = amount / 2;
        uint256 tokensAddToLiquidity = amount - tokensToSwap;

        // Contract's current ETH balance.
        uint256 initialBalance = address(this).balance;

        // Swap half of the tokens to ETH.
        _swapTokensForEth(tokensToSwap, address(this));

        // Figure out the exact amount of tokens received from swapping.
        uint256 ethAddToLiquify = address(this).balance - initialBalance;

        // Add to the LP of this token and WETH pair (half ETH and half this token).
        _addLiquidity(ethAddToLiquify, tokensAddToLiquidity);
        emit SwapAndLiquify(tokensToSwap, ethAddToLiquify, tokensAddToLiquidity);
    }

    function getTokenReserves() public view returns (uint256) {
        uint112 reserve;
        if (_uniswapV2Pair.token0() == address(this))
            (reserve,,) = _uniswapV2Pair.getReserves();
        else
            (,reserve,) = _uniswapV2Pair.getReserves();

        return uint256(reserve);
    }

    // Transfer

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

        require(_balances[sender] >= amount, "ERC20: transfer amount exceeds balance");
        
        // Indicates if fee should be deducted from transfer
        bool selling = recipient == address(_uniswapV2Pair);
        bool buying = sender == address(_uniswapV2Pair) && recipient != address(_uniswapV2Router);
        // Take fees when selling or buying, and the sender or recipient are not excluded
        bool takeFee = (selling || buying) && (!_isExcludedFromFee[sender] && !_isExcludedFromFee[recipient]);
        // Transfer amount, it will take fees if takeFee is true
        _tokenTransfer(sender, recipient, amount, takeFee, buying);
    }

    function _tokenTransfer(address sender, address recipient, uint256 amount, bool takeFee, bool buying) private {
        uint256 amountMinusFees = amount;
        if (takeFee) {
            // Maybe trigger token stability protection
            uint256 extraLiquidityFee = 0;
            uint256 extraDevFee = 0;
            uint256 extraBurnFee = 0;
            if (!buying && _tokenStabilityProtectionEnabled && amount >= (getTokenReserves() * _TOKEN_STABILITY_PROTECTION_THRESHOLD_PERCENTAGE / _PERCENTAGE_RELATIVE_TO)) {
                // Liquidity fee
                extraLiquidityFee = amount * _TAX_EXTRA_LIQUIDITY_PERCENTAGE / _PERCENTAGE_RELATIVE_TO;
                // Dev fee
                extraDevFee = amount * _TAX_EXTRA_DEV_PERCENTAGE / _PERCENTAGE_RELATIVE_TO;
                // Burn
                extraBurnFee = amount * _TAX_EXTRA_BURN_PERCENTAGE / _PERCENTAGE_RELATIVE_TO;
            }
            // Archa
            uint256 archaFee = 0;
            if (_archaFeeEnabled) {
                archaFee = amount * _TAX_NORMAL_ARCHA_PERCENTAGE / _PERCENTAGE_RELATIVE_TO;
                if (archaFee > 0) {
                    _balances[_archaWallet] += archaFee;
                    emit Transfer(sender, _archaWallet, archaFee);
                }
            }
            // Dev fee
            uint256 devFee = 0;
            if (_devFeeEnabled) {
                devFee = (amount * _TAX_NORMAL_DEV_PERCENTAGE / _PERCENTAGE_RELATIVE_TO) + extraDevFee;
                if (devFee > 0) {
                    _balances[address(this)] += devFee;
                    if (buying || _inSwap) {
                        // Store for a later swap
                        _devFeePendingSwap += devFee;
                    }
                    else {
                        // Swap for eth
                        _swapTokensForEth(devFee + _devFeePendingSwap, _developmentWallet);
                        _devFeePendingSwap = 0;
                    }
                }
            }
            // Ops
            uint256 opsFee = 0;
            if (_opsFeeEnabled) {
                opsFee = amount * _TAX_NORMAL_OPS_PERCENTAGE / _PERCENTAGE_RELATIVE_TO;
                if (opsFee > 0) {
                    _balances[address(this)] += opsFee;
                    if (buying || _inSwap) {
                        // Store for a later swap
                        _opsFeePendingSwap += opsFee;
                    }
                    else {
                        // Swap for eth
                        _swapTokensForEth(opsFee + _opsFeePendingSwap, _operationsWallet);
                        _opsFeePendingSwap = 0;
                    }
                }
            }
            // Liquity pool
            uint256 liquidityFee = 0;
            if (_liquidityFeeEnabled) {
                liquidityFee = (amount * _TAX_NORMAL_LIQUIDITY_PERCENTAGE / _PERCENTAGE_RELATIVE_TO) + extraLiquidityFee;
                if (liquidityFee > 0) {
                    _balances[address(this)] += liquidityFee;
                    if (buying || _inSwap) {
                        // Store for a later swap
                        _liquidityFeePendingSwap += liquidityFee;
                    }
                    else {
                        uint256 swapAndLiquifyAmount = liquidityFee + _liquidityFeePendingSwap;
                        if(_swapAndLiquifyEnabled) {
                            // Swap and liquify
                            if(swapAndLiquifyAmount > _minTokensBeforeSwapAndLiquify) {
                                _swapAndLiquify(swapAndLiquifyAmount);
                                _liquidityFeePendingSwap = 0;
                            } else {
                                // Accumulate until minimum amount is reached
                                _liquidityFeePendingSwap += liquidityFee;
                            }
                        } else if (_liquidityWallet != address(0)) {
                            // Send to liquidity wallet
                            _swapTokensForEth(swapAndLiquifyAmount, _liquidityWallet);
                            _liquidityFeePendingSwap = 0;
                        } else {
                            // Keep for later
                            _liquidityFeePendingSwap += liquidityFee;
                        }
                    }
                }
            }
            // Burn
            uint256 burnFee = 0;
            if(_burnFeeEnabled && extraBurnFee > 0) {
                burnFee = extraBurnFee;
                _totalSupply -= burnFee;
                emit Transfer(sender, _BURN_ADDRESS, burnFee);
            }
            // Final transfer amount
            uint256 totalFees = devFee + liquidityFee + opsFee + archaFee + burnFee;
            require (amount > totalFees, "ScratchToken: Token fees exceeds transfer amount");
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
        return _NAME;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public pure virtual returns (string memory) {
        return _SYMBOL;
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
        return _DECIMALS;
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
    function maxSupply() public pure returns (uint256) {
        return _MAX_SUPPLY;
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
