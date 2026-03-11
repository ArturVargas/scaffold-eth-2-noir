import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";

type NoirArtifact = {
  abi: {
    parameters: unknown[];
    return_type: unknown;
    error_types: Record<string, unknown>;
  };
  bytecode: string;
  noir_version: string;
};

type CircuitManifestEntry = {
  circuitName: string;
  abi: NoirArtifact["abi"];
  bytecode: string;
  noirVersion: string;
  backend: "bb";
  proofFlavor: "ultra_honk";
  artifactPath: string;
  verifierPath: string;
  verifierContractName: string;
};

const CIRCUITS_DIR = path.resolve("circuits");
const NEXTJS_TARGET_FILE = path.resolve("../nextjs/lib/noir/generated/circuitManifest.ts");
const NOIR_TARGET_FILE = path.resolve("./generated/circuitManifest.json");

async function getCircuitNames() {
  const entries = await readdir(CIRCUITS_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

async function buildManifest() {
  const manifest: Record<string, CircuitManifestEntry> = {};
  const circuitNames = await getCircuitNames();

  for (const circuitName of circuitNames) {
    const artifactPath = path.resolve(CIRCUITS_DIR, circuitName, "target", `${circuitName}.json`);
    const verifierPath = path.resolve("../hardhat/contracts/verifiers", `${circuitName}Verifier.sol`);
    const artifact = JSON.parse(await readFile(artifactPath, "utf8")) as NoirArtifact;

    manifest[circuitName] = {
      circuitName,
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      noirVersion: artifact.noir_version,
      backend: "bb",
      proofFlavor: "ultra_honk",
      artifactPath: path.relative(path.resolve(".."), artifactPath).replaceAll(path.sep, "/"),
      verifierPath: path.relative(path.resolve(".."), verifierPath).replaceAll(path.sep, "/"),
      verifierContractName: `${circuitName}Verifier`,
    };
  }

  return manifest;
}

async function writeOutputs() {
  const manifest = await buildManifest();
  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestTs = await prettier.format(
    `
export type CircuitManifestEntry = {
  circuitName: string;
  abi: {
    parameters: unknown[];
    return_type: unknown;
    error_types: Record<string, unknown>;
  };
  bytecode: string;
  noirVersion: string;
  backend: "bb";
  proofFlavor: "ultra_honk";
  artifactPath: string;
  verifierPath: string;
  verifierContractName: string;
};

export type CircuitManifest = Record<string, CircuitManifestEntry>;

const circuitManifest = ${manifestJson} as const satisfies CircuitManifest;

export default circuitManifest;
`,
    { parser: "typescript" },
  );

  await mkdir(path.dirname(NEXTJS_TARGET_FILE), { recursive: true });
  await mkdir(path.dirname(NOIR_TARGET_FILE), { recursive: true });
  await writeFile(NEXTJS_TARGET_FILE, manifestTs);
  await writeFile(NOIR_TARGET_FILE, manifestJson);
}

void writeOutputs();
