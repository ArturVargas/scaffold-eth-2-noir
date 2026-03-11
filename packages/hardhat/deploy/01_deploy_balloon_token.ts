import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployBalloonToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("BalloonToken", {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });
};

export default deployBalloonToken;

deployBalloonToken.tags = ["NoirStarter", "BalloonToken"];
