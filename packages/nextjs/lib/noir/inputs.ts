import { DEFAULT_ISSUER_PRIVATE_KEY } from "./constants";
import type { AgeProofForm, AgeProofInputs, SignedBirthClaim } from "./types";
import { secp256k1 } from "@noble/curves/secp256k1";
import { blake2s } from "@noble/hashes/blake2s";
import { bytesToHex, hexToBytes, isAddress } from "viem";

const toByteArray = (hexValue: `0x${string}`, expectedLength?: number) => {
  const bytes = Array.from(hexToBytes(hexValue));
  if (expectedLength !== undefined && bytes.length !== expectedLength) {
    throw new Error(`Expected ${expectedLength} bytes but received ${bytes.length}`);
  }
  return bytes;
};

const getClaimPayload = (account: `0x${string}`, birthYear: number) => {
  if (!isAddress(account)) {
    throw new Error("A valid EVM address is required");
  }

  if (!Number.isInteger(birthYear) || birthYear < 0 || birthYear > 65535) {
    throw new Error("Birth year must fit into a uint16");
  }

  const addressBytes = hexToBytes(account);
  const payload = new Uint8Array(22);
  payload.set(addressBytes, 0);
  payload[20] = (birthYear >> 8) & 0xff;
  payload[21] = birthYear & 0xff;
  return payload;
};

export const signBirthYearClaim = async (
  account: `0x${string}`,
  birthYear: number,
  issuerPrivateKey: `0x${string}` = DEFAULT_ISSUER_PRIVATE_KEY,
): Promise<SignedBirthClaim> => {
  const privateKeyBytes = hexToBytes(issuerPrivateKey);
  const claimHash = blake2s(getClaimPayload(account, birthYear));
  const signature = secp256k1.sign(claimHash, privateKeyBytes).toCompactRawBytes();
  const publicKey = secp256k1.getPublicKey(privateKeyBytes, false);

  return {
    signedMessage: bytesToHex(signature),
    signerPublicKey: bytesToHex(publicKey),
  };
};

export const buildAgeProofInputs = ({
  requiredBirthYear,
  birthYear,
  account,
  signedClaim,
}: AgeProofForm & { account: `0x${string}`; signedClaim: SignedBirthClaim }): AgeProofInputs => {
  const publicKeyBytes = toByteArray(signedClaim.signerPublicKey, 65);
  const signatureBytes = toByteArray(signedClaim.signedMessage, 64);

  return {
    required_birth_year: requiredBirthYear,
    issuer_public_key_x: publicKeyBytes.slice(1, 33),
    issuer_public_key_y: publicKeyBytes.slice(33),
    subject_eth_address: toByteArray(account, 20),
    issuer_signed_message: signatureBytes,
    subject_birth_year: birthYear,
  };
};
