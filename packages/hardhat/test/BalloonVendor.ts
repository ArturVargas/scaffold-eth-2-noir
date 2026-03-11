import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre, { deployments, ethers } from "hardhat";
import { buildAgeProofInputs, signBirthYearClaim } from "../../nextjs/lib/noir/inputs";
import { proveOnServer } from "../../nextjs/lib/noir/provingServer";

const deployNoirStarterFixture = async () => {
  await deployments.fixture(["NoirStarter"]);

  const [deployer, kid, stranger] = await ethers.getSigners();
  const balloonVendor = await hre.ethers.getContract("BalloonVendor");
  const balloonToken = await hre.ethers.getContract("BalloonToken");

  return {
    deployer,
    kid,
    stranger,
    balloonToken,
    balloonVendor,
  };
};

const buildProofForAddress = async (address: `0x${string}`) => {
  const signedClaim = await signBirthYearClaim(address, 2014);
  const inputs = buildAgeProofInputs({
    account: address,
    birthYear: 2014,
    requiredBirthYear: 2013,
    issuerPrivateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    signedClaim,
  });

  return proveOnServer({
    circuitName: "LessThanSignedAge",
    inputs,
    mode: "server",
  });
};

describe("BalloonVendor", function () {
  it("accepts a valid proof and transfers a token", async function () {
    const { kid, balloonToken, balloonVendor } = await loadFixture(deployNoirStarterFixture);
    const proof = await buildProofForAddress(kid.address as `0x${string}`);

    await expect(balloonVendor.connect(kid).getFreeToken(proof.proof, proof.publicInputs))
      .to.emit(balloonVendor, "FreeTokenClaimed")
      .withArgs(kid.address, ethers.parseEther("1"));

    expect(await balloonToken.balanceOf(kid.address)).to.equal(ethers.parseEther("1"));
    expect(await balloonVendor.hasClaimedFreeToken(kid.address)).to.equal(true);
  });

  it("rejects proofs submitted by a different wallet than the one encoded in the public inputs", async function () {
    const { kid, stranger, balloonVendor } = await loadFixture(deployNoirStarterFixture);
    const proof = await buildProofForAddress(kid.address as `0x${string}`);

    await expect(
      balloonVendor.connect(stranger).getFreeToken(proof.proof, proof.publicInputs),
    ).to.be.revertedWithCustomError(balloonVendor, "InvalidPublicInputs");
  });
});
