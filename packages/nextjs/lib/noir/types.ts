import type circuitManifest from "./generated/circuitManifest";
import type { InputMap } from "@noir-lang/noir_js";

export type CircuitName = keyof typeof circuitManifest;

export type ProofMode = "browser" | "server";

export type NoirInputMap = InputMap;

export type ProofRequest<TInputs extends NoirInputMap = NoirInputMap> = {
  circuitName: CircuitName;
  inputs: TInputs;
  mode?: ProofMode;
};

export type ProofResponse = {
  circuitName: CircuitName;
  proof: `0x${string}`;
  publicInputs: `0x${string}`[];
  verified: boolean;
  backend: string;
  noirVersion: string;
  proofFlavor: string;
  mode: ProofMode;
};

export type AgeProofForm = {
  requiredBirthYear: number;
  birthYear: number;
  issuerPrivateKey: `0x${string}`;
};

export type SignedBirthClaim = {
  signedMessage: `0x${string}`;
  signerPublicKey: `0x${string}`;
};

export type AgeProofInputs = {
  required_birth_year: number;
  issuer_public_key_x: number[];
  issuer_public_key_y: number[];
  subject_eth_address: number[];
  issuer_signed_message: number[];
  subject_birth_year: number;
};
