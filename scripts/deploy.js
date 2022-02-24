/* eslint-disable prettier/prettier */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const uniswapV2RouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // PancakeSwap: 0x10ED43C718714eb63d5aA57B78B54704E256024E
const founder1 = "0x9b01AfF345625E06B329A471faBCEC4a903A4177";
const founder2 = "0x65636CaF77D2cEf9e69a2a7B2A9C59d3a61CA9c7";
const founder3 = "0xf76c0889FCd48569080612Cb2cdCc856e80DaA8b";
const founder4 = "0xF1E49A3a04085bb1e3EDa5A72a0b19b383ab6Fe2";
const founder5 = "0x2C73044F30134Ba45207A0C3E851B32e7156310B";
const exchange = "0x2718758A03FdCe9e6e23D5c6b3Fd270b26E0cfC5";
const dev = "0xD001C86042aef72F519A56d8Bb02D3b3c2c87B20";
const ops = "0xa353de1C926e136B6ccb516f31c38cF40004aCCE";
const archa = "0x7b8404be6480c44e25ee8c8446e408b1bfc92451";
const owner = "0x1C6353C75B5e28D4fD17e76271A4784707500A8D";

async function main() {
  console.log("Deploying...");
  const Token = await hre.ethers.getContractFactory("ScratchToken");
  const token = await Token.deploy(
    owner,
    founder1,
    founder2,
    founder3,
    founder4,
    founder5,
    dev,
    exchange,
    ops,
    archa,
    uniswapV2RouterAddress
  );
  await token.deployed();
  
  console.log("Token deployed to:", token.address);
  console.log("UniswapV2 pair deployed to:", await token.uniswapV2Pair());
  console.log("View the RINKEBY Contract at: " + "https://rinkeby.etherscan.io" + "/address/" + token.address);
  console.log("View the MAINNET Contract at: " + "https://etherscan.io" + "/address/" + token.address);
  const timelock1 = await token.foundersTimelocks(founder1);
  const timelock2 = await token.foundersTimelocks(founder2);
  const timelock3 = await token.foundersTimelocks(founder3);
  const timelock4 = await token.foundersTimelocks(founder4);
  const timelock5 = await token.foundersTimelocks(founder5);
  console.log("Founder1 timelock deployed to:", timelock1);
  console.log("Founder2 timelock deployed to:", timelock2);
  console.log("Founder3 timelock deployed to:", timelock3);
  console.log("Founder4 timelock deployed to:", timelock4);
  console.log("Founder5 timelock deployed to:", timelock5);

  // Perform Etherscan verification
  console.log("Awaiting some time before etherscan verification...");
  await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000)); // Wait a couple minutes before verifying
  await verifyTokenOnEtherscan(token.address);
  await verifyTimelockOnEtherscan(token.address, timelock1);
  await verifyTimelockOnEtherscan(token.address, timelock2);
  await verifyTimelockOnEtherscan(token.address, timelock3);
  await verifyTimelockOnEtherscan(token.address, timelock4);
  await verifyTimelockOnEtherscan(token.address, timelock5);

}

async function verifyTokenOnEtherscan(tokenAddress) {
  console.log("Verifying token on etherscan...");
  try {
    await hre.run("verify:verify", {
      address: tokenAddress,
      constructorArguments: [
        owner,
        founder1,
        founder2,
        founder3,
        founder4,
        founder5,
        dev,
        exchange,
        ops,
        archa,
        uniswapV2RouterAddress
      ],
    });
  } catch (e) {
    console.log("Token verification failed:", e);
  }
}

async function verifyTimelockOnEtherscan(tokenAddress, timelockAddress) {
  console.log("Verifying timelock on etherscan...");
  const timelock = await hre.ethers.getContractAt(
    "FoundersTimelock",
    timelockAddress
  );
  const token = await hre.ethers.getContractAt(
    "ScratchToken",
    tokenAddress
  );
  try {
    await hre.run("verify:verify", {
      address: timelockAddress,
      constructorArguments: [
        token.address,
        await timelock.beneficiary(),
        6 * 30 * 24 * 60 * 60, // 6 months in UNIX
        await timelock.vestingPeriod(),
        await timelock.vestingDuration(),
      ],
    });
  } catch (e) {
    console.log("Timelock verification failed:", e);
  }
}

// Run the script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// verifyTokenOnEtherscan("0xfD9eb2427C73da6DcE5f3C07eEcC9faca8f0AD0a").catch((error) => {
//     console.error(error);
//     process.exitCode = 1;
// });

// verifyTimelockOnEtherscan("0xF7DF8Db0176de11bDD358fc381D316baf82d31d1", "0x7C386e2DEE1192282f9D7f50d6Dc418b19948c00").catch((error) => {
//     console.error(error);
//     process.exitCode = 1;
//   });