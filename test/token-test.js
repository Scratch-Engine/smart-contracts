const { expect } = require("chai");
const { ethers } = require("hardhat");
// const dotenv = require("dotenv");

// TODO: Chai BigNumber assertions

// https://github.com/Uniswap/v2-periphery/blob/master/contracts/UniswapV2Router02.sol
// https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Pair.sol
// https://github.com/Uniswap/solidity-lib/blob/master/contracts/libraries/TransferHelper.sol
const uniswapV2RouterAbi = require("./abi/IUniswapV2Router02.json").abi;
const uniswapV2FactoryAbi = require("./abi/IUniswapV2Factory.json").abi;
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
    it("Burns 18% of supply", async function () {
      expect(await token.totalSupply()).to.equal(
        maxSupplyBn.mul("82").div("100")
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

    it("Users start with empty balance", async function () {
      expect((await token.balanceOf(addrEmpty.address)).toNumber()).to.equal(0);
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
    beforeEach(async function () {
      // Deploy uniswap pair
      const uniswapV2Router = new ethers.Contract(
        uniswapV2RouterAddress,
        uniswapV2RouterAbi,
        owner
      );

      // Add initial liquidity (1 ETH = 10^5 tokens)
      /// With MINIMUM_LIQUIDITY = 10**3 and amount0 * amount1 > MINIMUM_LIQUIDITY**2, one can calculate that this requirement is fulfilled when the pair address holds just more of 1000 wei of each token.
      const scratchForLiquidity = ethers.BigNumber.from("100000000000000000"); // 10**8 Scratch
      const ethForLiquidity = ethers.BigNumber.from("100000000000000000000"); // 100 ETH
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
      const uniswapV2Pair = await ethers.getContractAt(
        "IUniswapV2Pair",
        await token.uniswapV2Pair()
      );
      const result = await uniswapV2Pair.getReserves();
      // console.log(result);
      const res0 = result[0]; // Scratch
      const res1 = result[1]; // ETH
      // console.log(await uniswapV2Pair.token0());
      // console.log(await uniswapV2Pair.token1());

      return amount.mul(res1).div(res0); // return how many token0 needed to buy {amount} of token1
    }
    async function getScratchPriceForEth(amount) {
      const uniswapV2Pair = await ethers.getContractAt(
        "IUniswapV2Pair",
        await token.uniswapV2Pair()
      );
      const result = await uniswapV2Pair.getReserves();
      const res0 = result[0]; // Scratch
      const res1 = result[1]; // ETH

      return amount.mul(res0).div(res1);
    }

    it("Sell sends 2% fee to dev wallet in ETH", async function () {
      const initialBalance = ethers.BigNumber.from(
        await devWallet.getBalance()
      );
      const amount = ethers.BigNumber.from("100000000000000"); // 10**5 Scratch
      const taxEthPrice = ethers.BigNumber.from(
        await getEthPriceForScratch(amount.mul("2").div("100"))
      );
      // Assume a 2% slippage, so actualTax will always be bigger
      const approxSlippage = taxEthPrice.mul("2").div("100");
      const expectedTax = taxEthPrice.sub(approxSlippage);
      // Perform Sell
      await sellTokenOnUniswap(addr1, amount);
      const actualTax = ethers.BigNumber.from(await devWallet.getBalance()).sub(
        initialBalance
      );
      // Assert wallet got more ETH
      expect(actualTax.toNumber()).to.be.greaterThan(0);
      // Assert fee is 2%
      expect(actualTax.sub(expectedTax).toNumber()).to.be.greaterThan(0);
    });

    it("Sell sends 1% fee to ops wallet in ETH", async function () {
      const initialBalance = ethers.BigNumber.from(
        await opsWallet.getBalance()
      );
      const amount = ethers.BigNumber.from("100000000000000"); // 10**5 Scratch
      const taxEthPrice = ethers.BigNumber.from(
        await getEthPriceForScratch(amount.mul("1").div("100"))
      );
      // Assume a 2% slippage, so actualTax will always be bigger
      const approxSlippage = taxEthPrice.mul("2").div("100");
      const expectedTax = taxEthPrice.sub(approxSlippage);
      // Perform Sell
      await sellTokenOnUniswap(addr1, amount);
      const actualTax = ethers.BigNumber.from(await opsWallet.getBalance()).sub(
        initialBalance
      );
      // Assert wallet got more ETH
      expect(actualTax.toNumber()).to.be.greaterThan(0);
      // Assert fee is 1%
      expect(actualTax.sub(expectedTax).toNumber()).to.be.greaterThan(0);
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
        ethers.BigNumber.from(await token.balanceOf(archaWallet.address))
          .sub(initialBalance)
          .toNumber()
      ).to.equal(archaTax.toNumber());
    });

    it("Buy sends 2% fee to dev wallet in ETH", async function () {
      const initialBalance = ethers.BigNumber.from(
        await devWallet.getBalance()
      );
      const amount = ethers.BigNumber.from("100000000000000"); // 0.0001 ETH
      const scratchToBeBought = ethers.BigNumber.from(
        await getScratchPriceForEth(amount)
      );
      const taxEthPrice = ethers.BigNumber.from(
        await getEthPriceForScratch(scratchToBeBought.mul("2").div("100"))
      );
      // Assume a 4% slippage, so actualTax will always be bigger
      const approxSlippage = taxEthPrice.mul("4").div("100");
      const expectedTax = taxEthPrice.sub(approxSlippage);
      const expectedScratchToBeBought = scratchToBeBought.sub(
        scratchToBeBought.mul("4").div("100")
      );
      // Perform buy
      await buyTokenOnUniswap(addr1, amount);
      // Assert dev fee is around ~2%
      expect(
        ethers.BigNumber.from(await token.devFeePendingSwap())
          .sub(expectedScratchToBeBought.mul("2").div("100"))
          .toNumber()
      ).to.be.greaterThan(0);
      // Perform sell (with same amount) to trigger the swap
      await sellTokenOnUniswap(addr1, scratchToBeBought);
      const actualTax = ethers.BigNumber.from(await devWallet.getBalance())
        .sub(initialBalance)
        .div(2); // Ignore the selling fee
      // Assert wallet got more ETH
      expect(actualTax.toNumber()).to.be.greaterThan(0);
      // Assert fee is 1%
      expect(actualTax.sub(expectedTax).toNumber()).to.be.greaterThan(0);
    });

    it("Buy sends 1% fee to ops wallet in ETH", async function () {
      const initialBalance = ethers.BigNumber.from(
        await opsWallet.getBalance()
      );
      const amount = ethers.BigNumber.from("100000000000000"); // 0.0001 ETH
      const scratchToBeBought = ethers.BigNumber.from(
        await getScratchPriceForEth(amount)
      );
      const taxEthPrice = ethers.BigNumber.from(
        await getEthPriceForScratch(scratchToBeBought.mul("1").div("100"))
      );
      // Assume a 4% slippage, so actualTax will always be bigger
      const approxSlippage = taxEthPrice.mul("4").div("100");
      const expectedTax = taxEthPrice.sub(approxSlippage);
      const expectedScratchToBeBought = scratchToBeBought.sub(
        scratchToBeBought.mul("4").div("100")
      );
      // Perform buy
      await buyTokenOnUniswap(addr1, amount);
      // Assert opsFee is around ~1%
      expect(
        ethers.BigNumber.from(await token.opsFeePendingSwap())
          .sub(expectedScratchToBeBought.mul("1").div("100"))
          .toNumber()
      ).to.be.greaterThan(0);
      // Perform sell (with same amount) to trigger the swap
      await sellTokenOnUniswap(addr1, scratchToBeBought);
      const actualTax = ethers.BigNumber.from(await opsWallet.getBalance())
        .sub(initialBalance)
        .div(2); // Ignore the selling fee
      // Assert wallet got more ETH
      expect(actualTax.toNumber()).to.be.greaterThan(0);
      // Assert fee is 1%
      expect(actualTax.sub(expectedTax).toNumber()).to.be.greaterThan(0);
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
  });

  describe.only("Public Write Methods", function () {
    it("Only owner can use them", async function () {
      expect(
        token.connect(addr1).setArchaWallet(newWallet.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(token.setArchaWallet(newWallet.address)).to.not.be.reverted;
    });
    it("Changes the Archa Wallet", async function () {
      expect(await token.archaWallet()).to.equal(archaWallet.address);
      await token.setArchaWallet(newWallet.address);
      expect(await token.archaWallet()).to.equal(newWallet.address);
    });
  });
});
