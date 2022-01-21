const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Scratch Token", function () {

  let owner;
  let addr1;
  let addr2;
  let addrEmpty;
  let addrs;

  let token;

  const maxSupplyBn = ethers.BigNumber.from("100000000000000000000000000");

  beforeEach(async function () {
    await ethers.provider.send("hardhat_reset");
    // Get signers
    [owner, addr1, addr2, addrEmpty, ...addrs] = await ethers.getSigners();
    // Deploy contract
    const Token = await ethers.getContractFactory("ScratchToken");
    token = await Token.deploy();
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

    it("Sets the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });
  });

  describe("Distribution", function () {
    it("Burns 15% of supply", async function () {
      expect(await token.totalSupply()).to.equal(
        maxSupplyBn.mul("85").div("100")
      );
    });

    it("Transfers 5% to private investment", async function () {
      expect(
        await token.balanceOf("0xe69ac38cd6da0ea9a540b47399c430131216ced0")
      ).to.equal(maxSupplyBn.mul("5").div("100"));
    });

    it("Transfers 2.5% to founder #1", async function () {
      const timelockAddress = await token.foundersTimelocks(0);
      const timelock = await ethers.getContractAt(
        "FoundersTimelock",
        timelockAddress
      );
      expect(await timelock.beneficiary()).to.equal(
        "0xE69Ac38CD6Da0ea9a540b47399c430131216cED3"
      );
      expect(await timelock.lockedBalance()).to.equal(
        maxSupplyBn.mul("250").div("10000")
      );
    });

    it("Transfers 2.5% to founder #2", async function () {
      const timelockAddress = await token.foundersTimelocks(1);
      const timelock = await ethers.getContractAt(
        "FoundersTimelock",
        timelockAddress
      );
      expect(await timelock.beneficiary()).to.equal(
        "0xe69AC38cd6da0eA9a540B47399c430131216ced4"
      );
      expect(await timelock.lockedBalance()).to.equal(
        maxSupplyBn.mul("250").div("10000")
      );
    });

    it("Transfers 1.25% to founder #3", async function () {
      const timelockAddress = await token.foundersTimelocks(2);
      const timelock = await ethers.getContractAt(
        "FoundersTimelock",
        timelockAddress
      );
      expect(await timelock.beneficiary()).to.equal(
        "0xE69aC38cd6dA0ea9a540b47399C430131216ced5"
      );
      expect(await timelock.lockedBalance()).to.equal(
        maxSupplyBn.mul("125").div("10000")
      );
    });

    it("Transfers 2.50% to founder #4", async function () {
      const timelockAddress = await token.foundersTimelocks(3);
      const timelock = await ethers.getContractAt(
        "FoundersTimelock",
        timelockAddress
      );
      expect(await timelock.beneficiary()).to.equal(
        "0xE69aC38Cd6Da0EA9a540b47399C430131216Ced6"
      );
      expect(await timelock.lockedBalance()).to.equal(
        maxSupplyBn.mul("250").div("10000")
      );
    });

    it("Transfers 1.75% to founder #5", async function () {
      const timelockAddress = await token.foundersTimelocks(4);
      const timelock = await ethers.getContractAt(
        "FoundersTimelock",
        timelockAddress
      );
      expect(await timelock.beneficiary()).to.equal(
        "0xE69Ac38Cd6DA0EA9a540B47399C430131216Ced7"
      );
      expect(await timelock.lockedBalance()).to.equal(
        maxSupplyBn.mul("175").div("10000")
      );
    });

    it("Transfers 5% to dev", async function () {
      expect(
        await token.balanceOf("0xe69AC38cD6Da0Ea9a540b47399c430131216CeD1")
      ).to.equal(maxSupplyBn.mul("5").div("100"));
    });

    it("Transfers 5% to exchange", async function () {
      expect(
        await token.balanceOf("0xE69Ac38cd6da0Ea9a540b47399C430131216CEd2")
      ).to.equal(maxSupplyBn.mul("5").div("100"));
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      // Transfer 50 tokens from owner to addr1
      await token.transfer(addr1.address, 50);
      expect(await token.balanceOf(addr1.address)).to.equal(50);

      // Transfer 50 tokens from addr1 to addr2
      // We use .connect(signer) to send a transaction from another account
      await token.connect(addr1).transfer(addr2.address, 50);
      expect(await token.balanceOf(addr2.address)).to.equal(50);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);

      // Try to send 1 token from addrEmpty (0 tokens) to owner (1000000 tokens).
      // `require` will evaluate false and revert the transaction.
      await expect(
        token.connect(addrEmpty).transfer(owner.address, 1)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      // Owner balance shouldn't have changed.
      expect(await token.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });

    it("Should update balances after transfers", async function () {
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
});
