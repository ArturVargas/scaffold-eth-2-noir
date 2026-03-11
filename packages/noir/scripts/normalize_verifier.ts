import { readFile, writeFile } from "node:fs/promises";

const [, , verifierPath, circuitName] = process.argv;

if (!verifierPath || !circuitName) {
  throw new Error("Usage: tsx scripts/normalize_verifier.ts <verifierPath> <circuitName>");
}

const replacements: Array<[string, string]> = [
  ["HonkVerificationKey", `${circuitName}HonkVerificationKey`],
  ["BaseZKHonkVerifier", `${circuitName}BaseZKHonkVerifier`],
  ["CommitmentSchemeLib", `${circuitName}CommitmentSchemeLib`],
  ["ZKTranscriptLib", `${circuitName}ZKTranscriptLib`],
  ["RelationsLib", `${circuitName}RelationsLib`],
  ["HonkVerifier", `${circuitName}Verifier`],
  ["IVerifier", `I${circuitName}Verifier`],
  ["FrLib", `${circuitName}FrLib`],
  ["Honk", `${circuitName}Honk`],
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function normalizeVerifier() {
  let contents = await readFile(verifierPath, "utf8");

  for (const [sourceName, targetName] of replacements) {
    contents = contents.replace(new RegExp(`\\b${escapeRegex(sourceName)}\\b`, "g"), targetName);
  }

  await writeFile(verifierPath, contents);
}

void normalizeVerifier();
