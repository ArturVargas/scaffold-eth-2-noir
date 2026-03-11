import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployBalloonVendor: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;
  const balloonToken = await get("BalloonToken");
  const verifier = await get("VerifierLessThanSignedAge");

  const vendorDeployment = await deploy("BalloonVendor", {
    from: deployer,
    args: [deployer, balloonToken.address, verifier.address],
    log: true,
    autoMine: true,
  });

  const balloonTokenContract = await hre.ethers.getContractAt("BalloonToken", balloonToken.address);
  const vendorTokenBalance = await balloonTokenContract.balanceOf(vendorDeployment.address);

  if (vendorTokenBalance === 0n) {
    const transferAmount = hre.ethers.parseEther("1000");
    const estimatedGas = await balloonTokenContract.transfer.estimateGas(vendorDeployment.address, transferAmount);

    await balloonTokenContract.transfer(vendorDeployment.address, transferAmount, {
      gasLimit: (estimatedGas * 12n) / 10n,
    });
  }
};

export default deployBalloonVendor;

deployBalloonVendor.tags = ["NoirStarter", "BalloonVendor"];
