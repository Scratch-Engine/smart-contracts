const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Scratch Token", function () {
  let token;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    // Deploy contract
    const Token = await ethers.getContractFactory("ScratchToken");
    token = await Token.deploy();
    await token.deployed();
  });

  describe("Deployment", function () {
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
      expect(await token.totalSupply()).to.equal(
        ethers.BigNumber.from("100000000000000000000000000")
      );
    });

    it("Sets the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Assigns the total supply of tokens to the owner", async function () {
      const [owner] = await ethers.getSigners();

      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      // Transfer 50 tokens from owner to addr1
      await token.transfer(addr1.address, 50);
      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(50);

      // Transfer 50 tokens from addr1 to addr2
      // We use .connect(signer) to send a transaction from another account
      await token.connect(addr1).transfer(addr2.address, 50);
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);

      // Try to send 1 token from addr1 (0 tokens) to owner (1000000 tokens).
      // `require` will evaluate false and revert the transaction.
      await expect(
        token.connect(addr1).transfer(owner.address, 1)
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
