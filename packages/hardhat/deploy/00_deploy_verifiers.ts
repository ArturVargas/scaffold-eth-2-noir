import { readdir } from "node:fs/promises";
import path from "node:path";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployVerifiers: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const verifiersDirectory = path.resolve(hre.config.paths.root, "contracts", "verifiers");
  const verifierFiles = (await readdir(verifiersDirectory)).filter(fileName => fileName.endsWith("Verifier.sol"));

  if (verifierFiles.length === 0) {
    throw new Error("No generated verifiers found. Run `yarn noir:export` before deploying.");
  }

  for (const verifierFile of verifierFiles) {
    const circuitName = verifierFile.replace(/Verifier\.sol$/, "");
    const fullyQualifiedVerifier = `contracts/verifiers/${verifierFile}:${circuitName}Verifier`;
    const verifierArtifact = await hre.artifacts.readArtifact(fullyQualifiedVerifier);
    const fileLinkReferences = verifierArtifact.linkReferences[`contracts/verifiers/${verifierFile}`] || {};
    const libraries: Record<string, string> = {};

    for (const libraryName of Object.keys(fileLinkReferences)) {
      const deployedLibrary = await deploy(`Verifier${circuitName}${libraryName}`, {
        from: deployer,
        contract: `contracts/verifiers/${verifierFile}:${libraryName}`,
        args: [],
        log: true,
        autoMine: true,
      });

      libraries[libraryName] = deployedLibrary.address;
    }

    await deploy(`Verifier${circuitName}`, {
      from: deployer,
      contract: fullyQualifiedVerifier,
      libraries,
      args: [],
      log: true,
      autoMine: true,
    });
  }
};

export default deployVerifiers;

deployVerifiers.tags = ["NoirStarter", "Verifiers"];
