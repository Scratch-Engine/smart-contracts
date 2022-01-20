//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.4;

// We import this library to be able to use console.log
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

// This is the main building block for smart contracts.
contract ScratchToken is Context, ERC20, ERC20Burnable, Ownable {

    using SafeMath for uint256;
    using Address for address;

    mapping (address => bool) private _isExcludedFromFee;
   
    // uint256 private _tFeeTotal;

    // Info
    string private _name = "ScratchToken";
    string private _symbol = "SCRATCH";

    /// Distribution
    // Percentages
    uint8 private _distBurnPercentage = 15;
    uint8 private _distPrivateInvestmentPercentage = 5;
    uint8 private _distOperationsAndFounderPercentage = 15;
    uint8 private _distDevWalletPercentage = 5;
    uint8 private _distExchangePercentage = 5;
    uint8 private _distPreSalePercentage = 10;

    // Wallets
    address private _privateInvestmentWallet = 0xE69Ac38Cd6DA0EA9a540B47399C430131216Ced7;
    address[] private _operationsAndFounderWallets = [
        0xE69Ac38Cd6DA0EA9a540B47399C430131216Ced7
    ];
    address private _developmentWallet= 0xE69Ac38Cd6DA0EA9a540B47399C430131216Ced7;
    address private _exchangeWallet = 0xE69Ac38Cd6DA0EA9a540B47399C430131216Ced7;
    
    // uint256 public _taxFee = 5;
    // uint256 private _previousTaxFee = _taxFee;
    
    // uint256 public _liquidityFee = 5;
    // uint256 private _previousLiquidityFee = _liquidityFee;

    function decimals() public pure override returns (uint8) {
        return 9;
    }
    
    constructor () ERC20(_name, _symbol) {
        
        // TODO: Setup Uniswap router
        // IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F);
        //  // Create a uniswap pair for this new token
        // uniswapV2Pair = IUniswapV2Factory(_uniswapV2Router.factory())
        //     .createPair(address(this), _uniswapV2Router.WETH());

        // // set the rest of the contract variables
        // uniswapV2Router = _uniswapV2Router;
        
        //exclude owner and this contract from fee
        _isExcludedFromFee[owner()] = true;
        _isExcludedFromFee[address(this)] = true;

        /// Mint
        // 100 quadrillion tokens with 9 decimals
        _mint(msg.sender, 100 * 10**15 * 10 ** decimals());
        /// Distribute
        // Burn
        _burn(msg.sender, totalSupply() * (_distBurnPercentage / 100));
        // Private Investment
        _transfer(msg.sender, _privateInvestmentWallet, totalSupply() * (_distPrivateInvestmentPercentage / 100));
        // TODO: Operations and Founder transfer to timelock
        // Dev wallet
        _transfer(msg.sender, _developmentWallet, totalSupply() * (_distDevWalletPercentage / 100));
        // Exchange
        _transfer(msg.sender, _exchangeWallet, totalSupply() * (_distExchangePercentage / 100));
        // TODO: Presale
        // TODO: Available supply?
    }


    // Public:
    // transfer
    // allowance
    // approve
    // transferFrom
    // increaseAllowance
    // decreaseAllowance

}