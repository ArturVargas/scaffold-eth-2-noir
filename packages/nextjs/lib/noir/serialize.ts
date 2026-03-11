import { bytesToHex, padHex, toHex } from "viem";

export const normalizeProof = (proof: Uint8Array | number[] | string): `0x${string}` => {
  if (typeof proof === "string") {
    return proof as `0x${string}`;
  }

  return bytesToHex(proof instanceof Uint8Array ? proof : new Uint8Array(proof));
};

export const normalizePublicInputs = (publicInputs: unknown[]): `0x${string}`[] => {
  return publicInputs.map(value => {
    if (typeof value === "string" && value.startsWith("0x")) {
      return padHex(value as `0x${string}`, { size: 32 });
    }

    if (typeof value === "number" || typeof value === "bigint") {
      return toHex(value, { size: 32 });
    }

    if (value instanceof Uint8Array) {
      return padHex(bytesToHex(value), { size: 32 });
    }

    if (Array.isArray(value)) {
      return padHex(bytesToHex(new Uint8Array(value as number[])), { size: 32 });
    }

    throw new Error(`Unsupported public input value: ${String(value)}`);
  });
};
