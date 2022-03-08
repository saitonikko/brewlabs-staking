// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile 
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const Factory = await hre.ethers.getContractFactory("BrewLabsStakingFactory");
  const factory = await Factory.deploy();
  await factory.deployed();
  console.log("factory deployed to:", factory.address);

  // const Lockup = await hre.ethers.getContractFactory("BrewlabsLockup");
  // const lockup = await Lockup.deploy();
  // await lockup.deployed();
  // console.log("lockup deployed to:", lockup.address);

  // const UnLock = await hre.ethers.getContractFactory("BrewlabsStaking");
  // const unlock = await UnLock.deploy();
  // await unlock.deployed();
  // console.log("unlock deployed to:", unlock.address);

  // const Staking = await hre.ethers.getContractFactory("BrewlabsLockup");
  // const staking = await Staking.deploy();
  // await staking.deployed();
  // const Staking = await hre.ethers.getContractFactory("LiquidityGeneratorToken");
  // const staking = await Staking.deploy(
  //   "ETH",
  //   "ETH",
  //   '0x' + Math.pow(10, 17).toString(16),
  //   "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
  //   "0x0000000000000000000000000000000000000000",
  //   0,
  //   0,
  //   0,
  // );

  // await staking.deployed();

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
