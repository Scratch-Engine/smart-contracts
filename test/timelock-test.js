const { expect } = require("chai");
const { ethers } = require("hardhat");
const dotenv = require('dotenv');

describe("FoundersTimelock", function () {
  let token;
  let timelock;
  let owner;
  let founder1;
  let addr1;
  let addrs;

  // Params
  const cliffDuration = 6 * 30 * 24 * 60 * 60;
  const vestingPeriod = 30 * 24 * 60 * 60;
  const vestingDuration = 10;
  const totalBalanceBN = ethers.BigNumber.from("2500000000000000000000000");
  beforeEach(async function () {
    await ethers.provider.send("hardhat_reset");
    // Get signers
    [owner, founder1, addr1, ...addrs] = await ethers.getSigners();
    // Deploy token
    const Token = await ethers.getContractFactory("ScratchToken");
    token = await Token.deploy(
      founder1.address,
      addrs[0].address,
      addrs[1].address,
      addrs[2].address,
      addrs[3].address,
      addrs[4].address,
      addrs[5].address,
      addrs[6].address,
      addrs[7].address
    );
    await token.deployed();
    // Get Timelock
    const timelockAddress = await token.foundersTimelocks(founder1.address);
    timelock = await ethers.getContractAt("FoundersTimelock", timelockAddress);
    await timelock.deployed();
  });

  describe("Deployment", function () {
    it("Token is the owner", async () => {
      expect(await timelock.owner()).to.equal(token.address);
    });

    it("Has a beneficiary", async function () {
      expect(await timelock.beneficiary()).to.equal(founder1.address);
    });

    it("Has 0 tokens released", async function () {
      expect(await timelock.releasedBalance()).to.equal(0);
    });

    it("Has all tokens locked", async function () {
      expect(await timelock.lockedBalance()).to.equal(totalBalanceBN);
    });

    it("Non-beneficiaries cannot release", async function () {
      expect(timelock.release()).to.be.revertedWith(
        "FoundersTimelock: only beneficiary can release tokens"
      );
      expect(timelock.connect(addr1).release()).to.be.revertedWith(
        "FoundersTimelock: only beneficiary can release tokens"
      );
    });

    it("Will not release tokens", async function () {
      expect(timelock.connect(founder1).release()).to.be.revertedWith(
        "FoundersTimelock: no tokens are due"
      );
    });
  });

  describe("Release", function () {
    it("Will not release before cliff", async function () {
      expect(timelock.connect(founder1).release()).to.be.revertedWith(
        "FoundersTimelock: no tokens are due"
      );
      const cliff = ~~(Date.now() / 1000 + cliffDuration);
      await ethers.provider.send("evm_mine", [cliff - 2]);
      expect(timelock.connect(founder1).release()).to.be.revertedWith(
        "FoundersTimelock: no tokens are due"
      );
    });
    it("Releases after cliff (without fees)", async function () {
      const cliff = ~~(Date.now() / 1000 + cliffDuration);
      await ethers.provider.send("evm_mine", [cliff + 1]);
      // Ensure tokens are not released before calling "release()" yet
      expect(await timelock.releasedBalance()).to.equal(0);
      expect(await token.balanceOf(founder1.address)).to.equal(0);
      // Release
      await expect(timelock.connect(founder1).release()).to.not.be.reverted;
      // Ensure tokens are released
      expect(await timelock.releasedBalance()).to.equal(
        ethers.BigNumber.from(totalBalanceBN.div(vestingDuration).toString())
      );
      // Ensure tokens are received by beneficiary
      expect(await token.balanceOf(founder1.address)).to.equal(
        ethers.BigNumber.from(totalBalanceBN.div(vestingDuration).toString())
      );
    });
    it("Releases on each period", async function () {
      const cliff = ~~(Date.now() / 1000 + cliffDuration);
      expect(await timelock.releasedBalance()).to.equal(0);
      expect(await token.balanceOf(founder1.address)).to.equal(0);
      // Release
      for (let i = 0; i < vestingDuration; i++) {
        await ethers.provider.send("evm_mine", [cliff + 1 + i * vestingPeriod]);
        await expect(timelock.connect(founder1).release()).to.not.be.reverted;
        const tokensPerPeriod = totalBalanceBN.div(vestingDuration);
        const periodTokens = ethers.BigNumber.from(
          tokensPerPeriod.mul(i + 1).toString()
        );
        expect(await timelock.releasedBalance()).to.equal(periodTokens);
        expect(await token.balanceOf(founder1.address)).to.equal(periodTokens);
      }
      // Confirm all tokens are released
      expect(await timelock.releasedBalance()).to.equal(totalBalanceBN);
      expect(await timelock.lockedBalance()).to.equal(0);
      expect(await token.balanceOf(founder1.address)).to.equal(totalBalanceBN);
    });
    it("Can release all at once in the end", async function () {
      const cliff = ~~(Date.now() / 1000 + cliffDuration);
      expect(await timelock.releasedBalance()).to.equal(0);
      expect(await token.balanceOf(founder1.address)).to.equal(0);
      // Release
      await ethers.provider.send("evm_mine", [
        cliff + 1 + vestingDuration * vestingPeriod,
      ]);
      await expect(timelock.connect(founder1).release()).to.not.be.reverted;
      // Confirm all tokens are released
      expect(await timelock.releasedBalance()).to.equal(totalBalanceBN);
      expect(await timelock.lockedBalance()).to.equal(0);
      expect(await token.balanceOf(founder1.address)).to.equal(totalBalanceBN);
    });
  });
});
