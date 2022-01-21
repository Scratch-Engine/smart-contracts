//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.4;

// Import this library to be able to use console.log
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./FoundersTimelock.sol";

contract ScratchToken is Context, ERC20, ERC20Burnable, Ownable {

    using SafeMath for uint256;
    using Address for address;

    mapping (address => bool) private _isExcludedFromFee;
   
    // Info
    string private _name = "ScratchToken";
    string private _symbol = "SCRATCH";

    /// Distribution
    uint256 private _maxSupply;
    struct DistributionWallet {
        address wallet;
        uint256 distPercentage;
    }
    // Percentages (in 1/10,000)
    uint256 private _distPercentageRelativeTo = 10000;

    uint256 private _distBurnPercentage = 1500;
    uint256 private _distOperationsAndFounderPercentage = 1500; // TODO: What of this?
    uint256 private _distPreSalePercentage = 1000; // TODO: What of this?

    // Wallets
    DistributionWallet private _privateInvestmentWallet = DistributionWallet(address(0xE69AC38Cd6DA0eA9A540B47399C430131216ceD0), 500);
    DistributionWallet[5] private _foundersWallet;
    DistributionWallet private _developmentWallet= DistributionWallet(address(0xe69AC38cD6Da0Ea9a540b47399c430131216CeD1), 500);
    DistributionWallet private _exchangeWallet = DistributionWallet(address(0xE69Ac38cd6da0Ea9a540b47399C430131216CEd2), 500);

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
    
    constructor () ERC20(_name, _symbol) {
        
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
        _foundersWallet[0] = DistributionWallet(address(0xE69Ac38CD6Da0ea9a540b47399c430131216cED3), 250);
        _foundersWallet[1] = DistributionWallet(address(0xe69AC38cd6da0eA9a540B47399c430131216ced4), 250);
        _foundersWallet[2] = DistributionWallet(address(0xE69aC38cd6dA0ea9a540b47399C430131216ced5), 125);
        _foundersWallet[3] = DistributionWallet(address(0xE69aC38Cd6Da0EA9a540b47399C430131216Ced6), 250);
        _foundersWallet[4] = DistributionWallet(address(0xE69Ac38Cd6DA0EA9a540B47399C430131216Ced7), 175);

        /// TODO: Mint to addresses directly
        // 100 quadrillion tokens with 9 decimals
        _maxSupply = 100 * 10**15 * 10 ** decimals();
        /// Distribute
        // Burn
        // _burn(msg.sender, _getAmountToDistribute(_distBurnPercentage));
        // TODO: Private Investment Airdrops
        _mint(_privateInvestmentWallet.wallet, _getAmountToDistribute(_privateInvestmentWallet.distPercentage));
        // Operations and Founder
        for (uint256 index = 0; index < _foundersWallet.length; index++) {
            FoundersTimelock timelockContract = new FoundersTimelock(this, _foundersWallet[index].wallet, _foundersCliffDuration, _foundersVestingPeriod, _foundersVestingDuration);
            foundersTimelocks[index] = timelockContract;
            _mint(address(timelockContract), _getAmountToDistribute(_foundersWallet[index].distPercentage));
            emit FounderLiquidityLocked(_foundersWallet[index].wallet, address(timelockContract), _getAmountToDistribute(_foundersWallet[index].distPercentage));
        }
        // Dev wallet
        _mint(_developmentWallet.wallet, _getAmountToDistribute(_developmentWallet.distPercentage));
        // Exchange
        _mint(_exchangeWallet.wallet, _getAmountToDistribute(_exchangeWallet.distPercentage));
        // TODO: Presale Airdrops

        // TODO: Available supply to pool
        
        // TODO: Remove once the rest of the tokens are distributed
        _mint(msg.sender, _maxSupply - totalSupply() - _getAmountToDistribute(_distBurnPercentage));
    }

    function _getAmountToDistribute(uint256 _distributionPercentage) private view returns (uint256) {
        return (_maxSupply * _distributionPercentage) / _distPercentageRelativeTo;
    }

    // Public:
    function decimals() public pure override returns (uint8) {
        return 9;
    }
    function maxSupply() public view returns (uint256) {
        return _maxSupply;
    }
    // transfer
    // allowance
    // approve
    // transferFrom
    // increaseAllowance
    // decreaseAllowance

}