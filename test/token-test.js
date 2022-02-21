const { expect } = require("chai");
const { ethers } = require("hardhat");
// const dotenv = require("dotenv");

// TODO: Chai BigNumber assertions

// https://github.com/Uniswap/v2-periphery/blob/master/contracts/UniswapV2Router02.sol
// https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Pair.sol
// https://github.com/Uniswap/solidity-lib/blob/master/contracts/libraries/TransferHelper.sol
const uniswapV2RouterAbi = require("./abi/IUniswapV2Router02.json").abi;
// const uniswapV2FactoryAbi = require("./abi/IUniswapV2Factory.json").abi;
const uniswapV2PairAbi = require("./abi/IUniswapV2Pair.json").abi;
const uniswapV2RouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

describe("Scratch Token", function () {
  let owner;
  let addr1;
  let addr2;
  let addrEmpty;
  let founder1;
  let founder2;
  let founder3;
  let founder4;
  let founder5;
  let devWallet;
  let exchangeWallet;
  let opsWallet;
  let archaWallet;
  let newWallet;
  let lpWallet;
  let liquidityWallet;
  let addrs;

  let token;

  const maxSupplyBn = ethers.BigNumber.from("100000000000000000000000000");

  beforeEach(async function () {
    // await ethers.provider.send("hardhat_reset"); // This resets removes the fork
    // Reset the fork
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.ALCHEMY_ETH_MAINNET_URL,
          blockNumber: parseInt(process.env.FORK_BLOCK_NUMBER || ""),
          enabled: true,
        },
      },
    ]);
    // Get signers
    [
      owner,
      addr1,
      addr2,
      founder1,
      founder2,
      founder3,
      founder4,
      founder5,
      devWallet,
      exchangeWallet,
      opsWallet,
      archaWallet,
      lpWallet,
      addrEmpty,
      newWallet,
      liquidityWallet,
      ...addrs
    ] = await ethers.getSigners();
    // Deploy contract
    const Token = await ethers.getContractFactory("ScratchToken");
    token = await Token.deploy(
      founder1.address,
      founder2.address,
      founder3.address,
      founder4.address,
      founder5.address,
      devWallet.address,
      exchangeWallet.address,
      opsWallet.address,
      archaWallet.address,
      uniswapV2RouterAddress
    );
    await token.deployed();
  });

  describe("Deployment", function () {
    it("Deployer is the owner", async () => {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Has a name", async function () {
      expect(await token.name()).to.equal("ScratchToken");
    });

    it("Has a symbol", async function () {
      expect(await token.symbol()).to.equal("SCRATCH");
    });

    it("Has 9 decimals", async function () {
      expect(await token.decimals()).to.equal(9);
    });

    it("Has 100 quadrillion tokens with 9 decimal units (10^26)", async function () {
      expect(await token.maxSupply()).to.equal(maxSupplyBn);
    });
  });

  describe("Distribution", function () {
    it("Burns 18.5% of supply", async function () {
      expect(await token.totalSupply()).to.equal(
        maxSupplyBn.mul("815").div("1000")
      );
    });

    it("Transfers 2.5% to founder #1", async function () {
      const timelockAddress = await token.foundersTimelocks(founder1.address);
      const timelock = await ethers.getContractAt(
        "FoundersTimelock",
        timelockAddress
      );
      expect(await timelock.beneficiary()).to.equal(founder1.address);
      expect(await timelock.lockedBalance()).to.equal(
        maxSupplyBn.mul("250").div("10000")
      );
    });

    it("Transfers 2.5% to founder #2", async function () {
      const timelockAddress = await token.foundersTimelocks(founder2.address);
      const timelock = await ethers.getContractAt(
        "FoundersTimelock",
        timelockAddress
      );
      expect(await timelock.beneficiary()).to.equal(founder2.address);
      expect(await timelock.lockedBalance()).to.equal(
        maxSupplyBn.mul("250").div("10000")
      );
    });

    it("Transfers 2.5% to founder #3", async function () {
      const timelockAddress = await token.foundersTimelocks(founder3.address);
      const timelock = await ethers.getContractAt(
        "FoundersTimelock",
        timelockAddress
      );
      expect(await timelock.beneficiary()).to.equal(founder3.address);
      expect(await timelock.lockedBalance()).to.equal(
        maxSupplyBn.mul("250").div("10000")
      );
    });

    it("Transfers 2.5% to founder #4", async function () {
      const timelockAddress = await token.foundersTimelocks(founder4.address);
      const timelock = await ethers.getContractAt(
        "FoundersTimelock",
        timelockAddress
      );
      expect(await timelock.beneficiary()).to.equal(founder4.address);
      expect(await timelock.lockedBalance()).to.equal(
        maxSupplyBn.mul("250").div("10000")
      );
    });

    it("Transfers 2.5% to founder #5", async function () {
      const timelockAddress = await token.foundersTimelocks(founder5.address);
      const timelock = await ethers.getContractAt(
        "FoundersTimelock",
        timelockAddress
      );
      expect(await timelock.beneficiary()).to.equal(founder5.address);
      expect(await timelock.lockedBalance()).to.equal(
        maxSupplyBn.mul("250").div("10000")
      );
    });

    it("Transfers 7.5% to exchange", async function () {
      expect(await token.balanceOf(exchangeWallet.address)).to.equal(
        maxSupplyBn.mul("75").div("1000")
      );
    });

    it("Transfers 5% to dev", async function () {
      expect(await token.balanceOf(devWallet.address)).to.equal(
        maxSupplyBn.mul("5").div("100")
      );
    });

    it("Transfers 1.5% to ops", async function () {
      expect(await token.balanceOf(opsWallet.address)).to.equal(
        maxSupplyBn.mul("15").div("1000")
      );
    });

    it("Transfers 0% to archa", async function () {
      expect(await token.balanceOf(archaWallet.address)).to.equal(0);
    });

    it("Transfers 55% (all remaining tokens) to owner", async function () {
      expect(await token.balanceOf(owner.address)).to.equal(
        maxSupplyBn.mul("55").div("100")
      );
    });

    it("Users start with empty balance", async function () {
      expect(await token.balanceOf(addrEmpty.address)).to.equal(0);
    });
  });

  describe("Transactions", function () {
    it("Transfers tokens between accounts", async function () {
      // Transfer 50 tokens from owner to addr1
      await token.transfer(addr1.address, 50);
      expect(await token.balanceOf(addr1.address)).to.equal(50);

      // Transfer 50 tokens from addr1 to addr2
      // We use .connect(signer) to send a transaction from another account
      expect(await token.connect(addr1).transfer(addr2.address, 50)).to.emit(
        token,
        "Transfer"
      );
      expect(await token.balanceOf(addr1.address)).to.equal(0);
      expect(await token.balanceOf(addr2.address)).to.equal(50);
    });

    it("Transfer fails when sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);

      // Try to send 1 token from addrEmpty (0 tokens) to owner (1000000 tokens).
      // `require` will evaluate false and revert the transaction.
      expect(
        token.connect(addrEmpty).transfer(owner.address, 1)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      // Owner balance shouldn't have changed.
      expect(await token.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });

    it("Updates balances after transfers", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);

      // Transfer 100 tokens from owner to addr1.
      await token.transfer(addr1.address, 100);

      // Transfer another 50 tokens from owner to addr2.
      await token.transfer(addr2.address, 50);

      // Check balances.
      const finalOwnerBalance = await token.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance.sub(150));

      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(100);

      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });
  });

  // describe("Fees", function () {
  //   it("Does not take fees when owner is involved", async function () {
  //     const initialOwnerBalance = ethers.BigNumber.from(
  //       await token.balanceOf(owner.address)
  //     );
  //     // Transfer 50 tokens from owner to addr1
  //     await token.transfer(addr1.address, 50);
  //     expect(await token.balanceOf(addr1.address)).to.equal(50);
  //     // Transfer 50 tokens back from addr1 to owner
  //     await token.connect(addr1).transfer(owner.address, 50);
  //     expect(await token.balanceOf(owner.address)).to.equal(
  //       initialOwnerBalance
  //     );
  //   });
  //   it("Takes 6% total fee between transfers", async function () {
  //     await token.transfer(addr1.address, 100);
  //     expect(await token.balanceOf(addr2.address)).to.equal(0);
  //     // Send 100 tokens from addr1 to addr2
  //     await token.connect(addr1).transfer(addr2.address, 100);
  //     // Assert fees were applied
  //     expect((await token.balanceOf(addr2.address)).toNumber()).to.equal(94);
  //   });

  //   it("Sends 1% fee to archa wallet", async function () {
  //     const initialBalance = ethers.BigNumber.from(
  //       await token.balanceOf(archaWallet.address)
  //     );
  //     await token.transfer(addr1.address, 100);
  //     // Send 100 tokens from addr1 to addr2
  //     await token.connect(addr1).transfer(addr2.address, 100);
  //     // Assert wallet got the fees
  //     expect(await token.balanceOf(archaWallet.address)).to.equal(
  //       initialBalance.add(1)
  //     );
  //   });
  // });

  describe("Uniswap Transactions", function () {
    const scratchForLiquidity = ethers.BigNumber.from("100000000000000000"); // 10**8 Scratch
    const ethForLiquidity = ethers.BigNumber.from("100000000000000000000"); // 100 ETH
    beforeEach(async function () {
      // Enable all fees
      await token.enableDevFee(true);
      await token.enableOpsFee(true);
      await token.enableLiquidityFee(true);
      await token.enableArchaFee(true);
      await token.enableBurnFee(true);
      await token.enableTokenStabilityProtection(true);
      // Deploy uniswap pair
      const uniswapV2Router = new ethers.Contract(
        uniswapV2RouterAddress,
        uniswapV2RouterAbi,
        owner
      );

      // Add initial liquidity (1 ETH = 10^5 tokens)
      /// With MINIMUM_LIQUIDITY = 10**3 and amount0 * amount1 > MINIMUM_LIQUIDITY**2, one can calculate that this requirement is fulfilled when the pair address holds just more of 1000 wei of each token.
      await token.approve(uniswapV2Router.address, scratchForLiquidity);
      // await token.approve(pairAddress, scratchForLiquidity);

      // console.log("Scratch: " + (await token.balanceOf(owner.address)));
      // console.log("Eth: " + (await owner.getBalance()));

      // Add the ETH<>Token pair to the pool.
      await uniswapV2Router.addLiquidityETH(
        token.address,
        scratchForLiquidity,
        0, // ignore slippage
        0, // ignore slippage
        lpWallet.address, // the receiver of the lp tokens
        Date.now() + 60,
        {
          from: owner.address,
          value: ethForLiquidity,
        }
      );

      // await ethers.provider.send("evm_mine");
      // console.log(await uniswapV2Pair.getReserves());
    });

    async function sellTokenOnUniswap(signer, amount) {
      const uniswapV2Router = new ethers.Contract(
        uniswapV2RouterAddress,
        uniswapV2RouterAbi,
        owner
      );
      // const uniswapV2Pair = await ethers.getContractAt(
      //   "IUniswapV2Pair",
      //   await token.uniswapV2Pair()
      // );
      // console.log(await uniswapV2Pair.getReserves());
      await token.transfer(signer.address, amount);
      // Sell tokens on Uniswap
      const path = [token.address, uniswapV2Router.WETH()];
      await token.connect(signer).approve(uniswapV2RouterAddress, amount);
      const tx = await uniswapV2Router
        .connect(signer)
        .swapExactTokensForETHSupportingFeeOnTransferTokens(
          amount,
          0, // Accept any eth amount
          path,
          signer.address,
          Math.floor(Date.now() / 1000) + 60 * 10
        );
      await tx.wait();
    }

    async function buyTokenOnUniswap(signer, amount) {
      const uniswapV2Router = new ethers.Contract(
        uniswapV2RouterAddress,
        uniswapV2RouterAbi,
        owner
      );
      // Buy tokens on Uniswap
      const path = [uniswapV2Router.WETH(), token.address];
      const tx = await uniswapV2Router
        .connect(signer)
        .swapExactETHForTokensSupportingFeeOnTransferTokens(
          0, // Accept any token amount
          path,
          signer.address,
          Math.floor(Date.now() / 1000) + 60 * 10,
          {
            value: amount,
          }
        );
      await tx.wait();
    }

    // calculate price based on pair reserves
    async function getEthPriceForScratch(amount) {
      const uniswapV2Pair = new ethers.Contract(
        await token.uniswapV2Pair(),
        uniswapV2PairAbi,
        owner
      );
      const uniswapV2Router = new ethers.Contract(
        uniswapV2RouterAddress,
        uniswapV2RouterAbi,
        owner
      );
      const result = await uniswapV2Pair.getReserves();
      // console.log(result);
      const token0 = await uniswapV2Pair.token0();
      // const token1 = await uniswapV2Pair.token1();
      const reserve0 = result[0];
      const reserve1 = result[1];
      if (token0 === token.address) {
        return uniswapV2Router.getAmountOut(amount, reserve0, reserve1);
      } else {
        return uniswapV2Router.getAmountOut(amount, reserve1, reserve0);
      }
      // return amount.mul(res0).div(res1.add); // return how many token0 needed to buy {amount} of token1
    }
    async function getScratchPriceForEth(amount) {
      const uniswapV2Pair = new ethers.Contract(
        await token.uniswapV2Pair(),
        uniswapV2PairAbi,
        owner
      );
      const uniswapV2Router = new ethers.Contract(
        uniswapV2RouterAddress,
        uniswapV2RouterAbi,
        owner
      );
      const result = await uniswapV2Pair.getReserves();
      const token0 = await uniswapV2Pair.token0();
      const reserve0 = result[0];
      const reserve1 = result[1];
      if (token0 === token.address) {
        return uniswapV2Router.getAmountOut(amount, reserve1, reserve0);
      } else {
        return uniswapV2Router.getAmountOut(amount, reserve0, reserve1);
      }
    }

    it("Sell sends 2% fee to dev wallet in ETH", async function () {
      await token.enableOpsFee(false);
      await token.enableLiquidityFee(false);
      const initialBalance = await devWallet.getBalance();
      const amount = ethers.BigNumber.from("100000000000000"); // 10**5 Scratch
      // Calculate 2% ETH tax
      const taxEthPrice = await getEthPriceForScratch(
        amount.mul("2").div("100")
      );
      // Perform Sell
      await sellTokenOnUniswap(addr1, amount);
      // Assert wallet got more ETH
      const devWalletIncrease = (await devWallet.getBalance()).sub(
        initialBalance
      );
      expect(devWalletIncrease).to.not.equal(ethers.BigNumber.from("0"));
      expect(devWalletIncrease).to.equal(taxEthPrice);
    });

    it("Sell sends 1% fee to ops wallet in ETH", async function () {
      await token.enableDevFee(false);
      await token.enableLiquidityFee(false);
      const initialBalance = ethers.BigNumber.from(
        await opsWallet.getBalance()
      );
      const amount = ethers.BigNumber.from("1000000000000000"); // 10**6 Scratch
      // Calculate 1% ETH tax
      const taxEthPrice = ethers.BigNumber.from(
        await getEthPriceForScratch(amount.mul("1").div("100"))
      );
      // Perform Sell
      await sellTokenOnUniswap(addr1, amount);
      // Assert wallet got more ETH
      const opsWalletIncrease = ethers.BigNumber.from(
        await opsWallet.getBalance()
      ).sub(initialBalance);
      expect(opsWalletIncrease).to.equal(taxEthPrice);
    });

    it("Sell sends 2% fee to liquidity wallet in ETH when set and SwapAndLiquify is disabled", async function () {
      await token.enableDevFee(false);
      await token.enableOpsFee(false);
      const initialBalance = await liquidityWallet.getBalance();
      const amount = ethers.BigNumber.from("1000000000000000"); // 10**6 Scratch
      // Set Liquidity to go to wallet
      await token.setLiquidityWallet(liquidityWallet.address);
      await token.enableSwapAndLiquify(false);
      // Calculate 2% ETH tax
      const taxEthPrice = await getEthPriceForScratch(
        amount.mul("2").div("100")
      );
      // Perform Sell
      await sellTokenOnUniswap(addr1, amount);
      // Assert wallet got more ETH
      const walletIncrease = (await liquidityWallet.getBalance()).sub(
        initialBalance
      );
      expect(walletIncrease).to.equal(taxEthPrice);
    });

    it("Sell does not send 2% fee to liquidity wallet when SwapAndLiquify is enabled", async function () {
      const initialBalance = await liquidityWallet.getBalance();
      const amount = ethers.BigNumber.from("1000000000000000"); // 10**6 Scratch
      // Set Liquidity wallet
      await token.setLiquidityWallet(liquidityWallet.address);
      await token.enableSwapAndLiquify(true);
      // Perform Sell
      await sellTokenOnUniswap(addr1, amount);
      // Assert wallet did not get more eth
      expect(initialBalance).to.equal(await liquidityWallet.getBalance());
    });

    it("Sell keeps 2% liquidity fee in contract when SwapAndLiquify is disabled and liquidity wallet is 0", async function () {
      const initialBalance = await liquidityWallet.getBalance();
      const amount = ethers.BigNumber.from("1000000000000000"); // 10**6 Scratch
      // Set Liquidity wallet
      await token.setLiquidityWallet(
        "0x0000000000000000000000000000000000000000"
      );
      await token.enableSwapAndLiquify(false);
      // Perform Sell
      await sellTokenOnUniswap(addr1, amount);
      // Assert wallet did not get more eth
      expect(initialBalance).to.equal(await liquidityWallet.getBalance());
      expect(await token.liquidityFeePendingSwap()).to.equal(
        amount.mul("2").div("100")
      );
    });

    it("Sell sends 1% fee to archa wallet in SCRATCH", async function () {
      const initialBalance = ethers.BigNumber.from(
        await token.balanceOf(archaWallet.address)
      );
      const amount = ethers.BigNumber.from("100000000000000"); // 10**5 Scratch
      const archaTax = amount.mul("1").div("100"); // ^ 1%
      await sellTokenOnUniswap(addr1, amount);
      // Assert wallet got more ETH
      expect(
        (await token.balanceOf(archaWallet.address)).sub(initialBalance)
      ).to.equal(archaTax);
    });

    it("Buy sends 2% fee to dev wallet in ETH", async function () {
      await token.enableOpsFee(false);
      await token.enableLiquidityFee(false);
      await token.enableArchaFee(false);
      const initialBalance = ethers.BigNumber.from(
        await devWallet.getBalance()
      );
      const buyAmount = ethers.BigNumber.from("100000000000000"); // 0.0001 ETH
      const scratchFromBuy = ethers.BigNumber.from(
        await getScratchPriceForEth(buyAmount)
      );
      // Perform buy
      await buyTokenOnUniswap(addr1, buyAmount);
      // Assert dev fee pending is ~2%
      expect(ethers.BigNumber.from(await token.devFeePendingSwap())).to.equal(
        scratchFromBuy.mul("2").div("100")
      );
      // Perform sell (with same amount) to trigger the swap
      const sellAmount = ethers.BigNumber.from("100000000000000"); // 10**5 Scratch
      const combinedTaxEthPrice = ethers.BigNumber.from(
        await getEthPriceForScratch(
          scratchFromBuy.mul("2").div("100").add(sellAmount.mul("2").div("100"))
        )
      );
      await sellTokenOnUniswap(addr2, sellAmount);
      // Assert buy fee is 2% + 2% sell fee
      const increasedBalance = ethers.BigNumber.from(
        await devWallet.getBalance()
      ).sub(initialBalance);
      expect(increasedBalance).to.equal(combinedTaxEthPrice);
    });

    it("Buy sends 1% fee to ops wallet in ETH", async function () {
      await token.enableDevFee(false);
      await token.enableLiquidityFee(false);
      await token.enableArchaFee(false);
      const initialBalance = ethers.BigNumber.from(
        await opsWallet.getBalance()
      );
      const buyAmount = ethers.BigNumber.from("100000000000000"); // 0.0001 ETH
      const scratchFromBuy = ethers.BigNumber.from(
        await getScratchPriceForEth(buyAmount)
      );
      // Perform buy
      await buyTokenOnUniswap(addr1, buyAmount);
      // Assert ops fee pending is ~1%
      expect(ethers.BigNumber.from(await token.opsFeePendingSwap())).to.equal(
        scratchFromBuy.mul("1").div("100")
      );
      // Perform sell (with same amount) to trigger the swap
      const sellAmount = ethers.BigNumber.from("100000000000000"); // 10**5 Scratch
      const combinedTaxEthPrice = ethers.BigNumber.from(
        await getEthPriceForScratch(
          scratchFromBuy.mul("1").div("100").add(sellAmount.mul("1").div("100"))
        )
      );
      await sellTokenOnUniswap(addr2, sellAmount);
      // Assert buy fee is 1% + 1% sell fee
      const increasedBalance = ethers.BigNumber.from(
        await opsWallet.getBalance()
      ).sub(initialBalance);
      expect(increasedBalance).to.equal(combinedTaxEthPrice);
    });

    it("Buy sends 1% fee to archa wallet in SCRATCH", async function () {
      await token.enableDevFee(false);
      await token.enableOpsFee(false);
      await token.enableLiquidityFee(false);
      const initialBalance = await token.balanceOf(archaWallet.address);
      const buyAmount = ethers.BigNumber.from("100000000000000"); // 0.0001 ETH
      const scratchFromBuy = await getScratchPriceForEth(buyAmount);
      // Perform buy
      await buyTokenOnUniswap(addr1, buyAmount);
      // Assert archa fee is ~1%
      expect(await token.balanceOf(archaWallet.address)).to.equal(
        initialBalance.add(scratchFromBuy.mul("1").div("100"))
      );
    });

    it("Buy takes total 6% fee", async function () {
      const initialBalance = await token.balanceOf(addr1.address);
      const buyAmount = ethers.BigNumber.from("100000000000000"); // 0.0001 ETH
      // Calculate ETH tax
      const scratchFromBuy = await getScratchPriceForEth(buyAmount);
      // Perform Buy
      await buyTokenOnUniswap(addr1, buyAmount);
      // Assert 6% fee is taken
      const walletIncrease = (await token.balanceOf(addr1.address)).sub(
        initialBalance
      );
      // Remove last decimals since accuracy will never be 100% correct
      expect(walletIncrease.div("10000")).to.equal(
        scratchFromBuy.mul("94").div("100").div("10000")
      );
    });

    it("Does not take fees when owner is involved", async function () {
      const initialBalance = ethers.BigNumber.from(
        await devWallet.getBalance()
      );
      const scratchAmount = ethers.BigNumber.from("100000000000000"); // 10**5 Scratch
      await sellTokenOnUniswap(owner, scratchAmount);
      const ethAmount = ethers.BigNumber.from("1000000000000000"); // 0.001 ETH
      await buyTokenOnUniswap(owner, ethAmount);
      // Assert wallet did not get any eth
      expect(await devWallet.getBalance()).to.equal(initialBalance);
    });

    describe("Token Stability Protection", async function () {
      const amountToTriggerTSP = scratchForLiquidity.mul("3").div("100");
      it("Returns the amount of Scratch in the pool", async function () {
        expect(await token.getTokenReserves()).to.equal(scratchForLiquidity);
      });

      it("Sell sends 2% + 5% to Dev in ETH", async function () {
        await token.enableOpsFee(false);
        await token.enableLiquidityFee(false);
        await token.enableArchaFee(false);
        const initialBalance = await devWallet.getBalance();
        // Calculate 7% ETH tax
        const taxEthPrice = await getEthPriceForScratch(
          amountToTriggerTSP.mul("7").div("100")
        );
        // Perform Sell
        await sellTokenOnUniswap(addr1, amountToTriggerTSP);
        // Assert wallet got more ETH
        const devWalletIncrease = (await devWallet.getBalance()).sub(
          initialBalance
        );
        expect(devWalletIncrease).to.not.equal(ethers.BigNumber.from("0"));
        expect(devWalletIncrease).to.equal(taxEthPrice);
      });

      it("Sell sends 2% + 10% to liquidity wallet in ETH when set and SwapAndLiquify is disabled", async function () {
        await token.enableDevFee(false);
        await token.enableOpsFee(false);
        const initialBalance = await liquidityWallet.getBalance();
        // Set Liquidity to go to wallet
        await token.setLiquidityWallet(liquidityWallet.address);
        await token.enableSwapAndLiquify(false);
        // Calculate 2% ETH tax
        const taxEthPrice = await getEthPriceForScratch(
          amountToTriggerTSP.mul("12").div("100")
        );
        // Perform Sell
        await sellTokenOnUniswap(addr1, amountToTriggerTSP);
        // Assert wallet got more ETH
        const walletIncrease = (await liquidityWallet.getBalance()).sub(
          initialBalance
        );
        expect(walletIncrease).to.equal(taxEthPrice);
      });

      it("Sell burns 5%", async function () {
        const initialTotalSupply = await token.totalSupply();
        // Perform Sell
        await sellTokenOnUniswap(addr1, amountToTriggerTSP);
        // Assert burn
        expect(await token.totalSupply()).to.equal(
          initialTotalSupply.sub(amountToTriggerTSP.mul("5").div("100"))
        );
      });

      it("Buy does not trigger Token Stability Protection", async function () {
        const initialTotalSupply = await token.totalSupply();
        // Perform Sell
        await buyTokenOnUniswap(addr1, ethForLiquidity.mul("3").div("100"));
        // Assert NOT burned
        expect(await token.totalSupply()).to.equal(initialTotalSupply);
      });
    });
  });

  describe("Public Write Methods", function () {
    it("Only owner can use them", async function () {
      expect(
        token.connect(addr1).setArchaWallet(newWallet.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(token.setArchaWallet(newWallet.address)).to.not.be.reverted;
    });
    it("Changes the Archa Wallet", async function () {
      await expect(token.connect(addr1).setArchaWallet(newWallet.address)).to.be
        .reverted;
      expect(await token.archaWallet()).to.equal(archaWallet.address);
      await token.setArchaWallet(newWallet.address);
      expect(await token.archaWallet()).to.equal(newWallet.address);
    });
    it("Excludes from fees", async function () {
      await expect(token.connect(addr1).excludeFromFees(newWallet.address)).to
        .be.reverted;
      expect(await token.isExcludedFromFees(archaWallet.address)).to.equal(
        true
      );
      await token.excludeFromFees(archaWallet.address, false);
      expect(await token.isExcludedFromFees(archaWallet.address)).to.equal(
        false
      );
      await token.excludeFromFees(archaWallet.address, true);
      expect(await token.isExcludedFromFees(archaWallet.address)).to.equal(
        true
      );
    });
    it("Toggles SwapAndLiquify", async function () {
      await expect(token.connect(addr1).enableSwapAndLiquify(false)).to.be
        .reverted;
      await token.enableSwapAndLiquify(false);
      expect(await token.swapAndLiquifyEnabled()).to.equal(false);
      await token.enableSwapAndLiquify(true);
      expect(await token.swapAndLiquifyEnabled()).to.equal(true);
    });
    it("Changes the Liquidity Wallet", async function () {
      await expect(token.connect(addr1).setLiquidityWallet(newWallet.address))
        .to.be.reverted;
      expect(await token.liquidityWallet()).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
      await token.setLiquidityWallet(newWallet.address);
      expect(await token.liquidityWallet()).to.equal(newWallet.address);
    });
    it("Enables dev fee", async function () {
      await expect(token.connect(addr1).enableDevFee(false)).to.be.reverted;
      expect(await token.devFeeEnabled()).to.equal(true);
      await token.enableDevFee(false);
      expect(await token.devFeeEnabled()).to.equal(false);
      await token.enableDevFee(true);
      expect(await token.devFeeEnabled()).to.equal(true);
    });
    it("Enables ops fee", async function () {
      await expect(token.connect(addr1).enableOpsFee(false)).to.be.reverted;
      expect(await token.opsFeeEnabled()).to.equal(true);
      await token.enableOpsFee(false);
      expect(await token.opsFeeEnabled()).to.equal(false);
      await token.enableOpsFee(true);
      expect(await token.opsFeeEnabled()).to.equal(true);
    });
    it("Enables archa fee", async function () {
      await expect(token.connect(addr1).enableArchaFee(false)).to.be.reverted;
      expect(await token.archaFeeEnabled()).to.equal(true);
      await token.enableArchaFee(false);
      expect(await token.archaFeeEnabled()).to.equal(false);
      await token.enableArchaFee(true);
      expect(await token.archaFeeEnabled()).to.equal(true);
    });
    it("Enables liquidity fee", async function () {
      await expect(token.connect(addr1).enableLiquidityFee(false)).to.be
        .reverted;
      expect(await token.liquidityFeeEnabled()).to.equal(true);
      await token.enableLiquidityFee(false);
      expect(await token.liquidityFeeEnabled()).to.equal(false);
      await token.enableLiquidityFee(true);
      expect(await token.liquidityFeeEnabled()).to.equal(true);
    });
    it("Enables burn fee", async function () {
      await expect(token.connect(addr1).enableBurnFee(false)).to.be.reverted;
      expect(await token.burnFeeEnabled()).to.equal(true);
      await token.enableBurnFee(false);
      expect(await token.burnFeeEnabled()).to.equal(false);
      await token.enableBurnFee(true);
      expect(await token.burnFeeEnabled()).to.equal(true);
    });
    it("Enables token stability protection", async function () {
      await expect(token.connect(addr1).enableTokenStabilityProtection(false))
        .to.be.reverted;
      expect(await token.tokenStabilityProtectionEnabled()).to.equal(true);
      await token.enableTokenStabilityProtection(false);
      expect(await token.tokenStabilityProtectionEnabled()).to.equal(false);
      await token.enableTokenStabilityProtection(true);
      expect(await token.tokenStabilityProtectionEnabled()).to.equal(true);
    });
  });
});
