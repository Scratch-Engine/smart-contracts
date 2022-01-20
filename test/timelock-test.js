const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FoundersTimelock", function () {
  let token;
  let timelock;
  let owner;
  let beneficiary;
  let addr2;
  let addrs;

  // Params
  const cliffDuration = 6 * 30 * 24 * 60 * 60;
  const vestingPeriod = 30 * 24 * 60 * 60;
  const vestingDuration = 10;
  const totalBalance = 1000;
  beforeEach(async function () {
    await ethers.provider.send("hardhat_reset");
    // Get signers
    [owner, beneficiary, addr2, ...addrs] = await ethers.getSigners();
    // Deploy token
    const Token = await ethers.getContractFactory("ScratchToken");
    token = await Token.deploy();
    await token.deployed();
    // Deploy timelock
    const Timelock = await ethers.getContractFactory("FoundersTimelock");
    timelock = await Timelock.deploy(
      token.address,
      beneficiary.address,
      cliffDuration,
      vestingPeriod,
      vestingDuration
    );
    await timelock.deployed();
    // Transfer tokens to timelock
    await token.transfer(timelock.address, totalBalance);
  });

  describe("Deployment", function () {
    it("Has a beneficiary", async function () {
      expect(await timelock.beneficiary()).to.equal(beneficiary.address);
    });

    it("Has 0 tokens released", async function () {
      expect(await timelock.releasedBalance()).to.equal(0);
    });

    it("Has all tokens locked", async function () {
      expect(await timelock.lockedBalance()).to.equal(totalBalance);
    });

    it("Non-beneficiaries cannot release", async function () {
      expect(timelock.release()).to.be.revertedWith(
        "FoundersTimelock: only beneficiary can release tokens"
      );
      expect(timelock.connect(addr2).release()).to.be.revertedWith(
        "FoundersTimelock: only beneficiary can release tokens"
      );
    });

    it("Will not release tokens", async function () {
      expect(timelock.connect(beneficiary).release()).to.be.revertedWith(
        "FoundersTimelock: no tokens are due"
      );
    });
  });

  describe("Release", function () {
    it("Will not release before cliff", async function () {
      expect(timelock.connect(beneficiary).release()).to.be.revertedWith(
        "FoundersTimelock: no tokens are due"
      );
      const cliff = ~~(Date.now() / 1000 + cliffDuration);
      await ethers.provider.send("evm_mine", [cliff - 2]);
      expect(timelock.connect(beneficiary).release()).to.be.revertedWith(
        "FoundersTimelock: no tokens are due"
      );
    });
    it("Releases after cliff", async function () {
      const cliff = ~~(Date.now() / 1000 + cliffDuration);
      await ethers.provider.send("evm_mine", [cliff + 1]);
      // Ensure tokens are not released before calling "release()" yet
      expect(await timelock.releasedBalance()).to.equal(0);
      expect(await token.balanceOf(beneficiary.address)).to.equal(0);
      // Release
      await expect(timelock.connect(beneficiary).release()).to.not.be.reverted;
      // Ensure tokens are released
      expect(await timelock.releasedBalance()).to.equal(
        ethers.BigNumber.from((totalBalance / vestingDuration).toString())
      );
      // Ensure tokens are received by beneficiary
      expect(await token.balanceOf(beneficiary.address)).to.equal(
        ethers.BigNumber.from((totalBalance / vestingDuration).toString())
      );
    });
    it("Releases on each period", async function () {
      const cliff = ~~(Date.now() / 1000 + cliffDuration);
      expect(await timelock.releasedBalance()).to.equal(0);
      expect(await token.balanceOf(beneficiary.address)).to.equal(0);
      // Release
      for (let i = 0; i < vestingDuration; i++) {
        await ethers.provider.send("evm_mine", [cliff + 1 + i * vestingPeriod]);
        await expect(timelock.connect(beneficiary).release()).to.not.be
          .reverted;
        const tokensPerPeriod = totalBalance / vestingDuration;
        const periodTokens = ethers.BigNumber.from(
          (tokensPerPeriod * (i + 1)).toString()
        );
        expect(await timelock.releasedBalance()).to.equal(periodTokens);
        expect(await token.balanceOf(beneficiary.address)).to.equal(
          periodTokens
        );
      }
      // Confirm all tokens are released
      expect(await timelock.releasedBalance()).to.equal(totalBalance);
      expect(await timelock.lockedBalance()).to.equal(0);
      expect(await token.balanceOf(beneficiary.address)).to.equal(totalBalance);
    });
    it("Can release all at once in the end", async function () {
      const cliff = ~~(Date.now() / 1000 + cliffDuration);
      expect(await timelock.releasedBalance()).to.equal(0);
      expect(await token.balanceOf(beneficiary.address)).to.equal(0);
      // Release
      await ethers.provider.send("evm_mine", [
        cliff + 1 + vestingDuration * vestingPeriod,
      ]);
      await expect(timelock.connect(beneficiary).release()).to.not.be.reverted;
      // Confirm all tokens are released
      expect(await timelock.releasedBalance()).to.equal(totalBalance);
      expect(await timelock.lockedBalance()).to.equal(0);
      expect(await token.balanceOf(beneficiary.address)).to.equal(totalBalance);
    });
  });
});
