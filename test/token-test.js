const { expect } = require("chai");
const { ethers } = require("hardhat");
// const dotenv = require("dotenv");

const uniswapRouterAbi = require("./abi/IUniswapV2Router02.json").abi;
const uniswapFactoryAbi = require("./abi/IUniswapV2Factory.json").abi;

describe.only("Scratch Token", function () {
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
  let lpWallet;
  let addrs;

  let token;

  const maxSupplyBn = ethers.BigNumber.from("100000000000000000000000000");

  beforeEach(async function () {
    // await ethers.provider.send("hardhat_reset"); // This resets the fork!
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
      archaWallet.address
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

  describe("Fees", function () {
    it("Does not take fees when owner is involved", async function () {
      const initialOwnerBalance = ethers.BigNumber.from(
        await token.balanceOf(owner.address)
      );
      // Transfer 50 tokens from owner to addr1
      await token.transfer(addr1.address, 50);
      expect(await token.balanceOf(addr1.address)).to.equal(50);
      // Transfer 50 tokens back from addr1 to owner
      await token.connect(addr1).transfer(owner.address, 50);
      expect(await token.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });
    it("Takes 6% fee between transfers", async function () {
      await token.transfer(addr1.address, 100);
      expect(await token.balanceOf(addr2.address)).to.equal(0);
      // Send 100 tokens from addr1 to addr2
      await token.connect(addr1).transfer(addr2.address, 100);
      // Assert fees were applied
      expect((await token.balanceOf(addr2.address)).toNumber()).to.equal(94);
    });

    it("Sends 2% fee to dev wallet", async function () {
      const initialBalance = ethers.BigNumber.from(
        await token.balanceOf(devWallet.address)
      );
      await token.transfer(addr1.address, 100);
      // Send 100 tokens from addr1 to addr2
      await token.connect(addr1).transfer(addr2.address, 100);
      // Assert wallet got the fees
      expect(await token.balanceOf(devWallet.address)).to.equal(
        initialBalance.add(2)
      );
    });

    it("Sends 1% fee to ops wallet", async function () {
      const initialBalance = ethers.BigNumber.from(
        await token.balanceOf(opsWallet.address)
      );
      await token.transfer(addr1.address, 100);
      // Send 100 tokens from addr1 to addr2
      await token.connect(addr1).transfer(addr2.address, 100);
      // Assert wallet got the fees
      expect(await token.balanceOf(opsWallet.address)).to.equal(
        initialBalance.add(1)
      );
    });

    it("Sends 1% fee to archa wallet", async function () {
      const initialBalance = ethers.BigNumber.from(
        await token.balanceOf(archaWallet.address)
      );
      await token.transfer(addr1.address, 100);
      // Send 100 tokens from addr1 to addr2
      await token.connect(addr1).transfer(addr2.address, 100);
      // Assert wallet got the fees
      expect(await token.balanceOf(archaWallet.address)).to.equal(
        initialBalance.add(1)
      );
    });
  });

  describe.only("Uniswap", function () {
    it("Uniswap integration", async function () {
      // Deploy uniswap pair
      const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
      const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
      const uniswapRouter = new ethers.Contract(
        routerAddress,
        uniswapRouterAbi,
        owner
      );
      const uniswapFactory = new ethers.Contract(
        factoryAddress,
        uniswapFactoryAbi,
        owner
      );

      /// With MINIMUM_LIQUIDITY = 10**3 and amount0 * amount1 > MINIMUM_LIQUIDITY**2, one can calculate that this requirement is fulfilled when the pair address holds just more of 1000 wei of each token.
      const scratchForLiquidity = 10 ** 9; // If this value is too small it will fail
      const ethForLiquidity = 1;

      console.log("Create Pair");
      // Get uniswap pair for this token 
      const uniswapV2Pair = await uniswapFactory.getPair(
        token.address,
        uniswapRouter.WETH()
      );
      console.log(uniswapV2Pair);
      // Create Uniswap pair
      // const uniswapV2Pair = await uniswapFactory.getPair(
      //   token.address,
      //   uniswapRouter.WETH()
      // );
      // const pairCreatedEvent = uniswapV2Pair.events[0];
      // console.log(pairCreatedEvent.args);
      // const pairAddress = pairCreatedEvent.args.pair;

      console.log("Approve");
      await token.approve(uniswapRouter.address, scratchForLiquidity);
      // await token.approve(pairAddress, scratchForLiquidity);

      console.log("Scratch: " + (await token.balanceOf(owner.address)));
      console.log("Eth: " + (await owner.getBalance()));

      console.log("Add Liquidity");
      console.log(owner.address);
      // Add the ETH<>Token pair to the pool.
      const initialLiquidityTx = await uniswapRouter.addLiquidityETH(
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
      const initialLiquidityResult = await initialLiquidityTx.wait();
      // Add some more
      await token.approve(uniswapRouter.address, scratchForLiquidity);
      await uniswapRouter.addLiquidityETH(
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
    });
  });
});
