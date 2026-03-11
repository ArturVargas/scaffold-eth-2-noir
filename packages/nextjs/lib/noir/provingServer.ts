import circuitManifest from "./generated/circuitManifest";
import { normalizeProof, normalizePublicInputs } from "./serialize";
import type { NoirInputMap, ProofRequest, ProofResponse } from "./types";
import { BackendType, Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { existsSync } from "node:fs";
import path from "node:path";

let serverApiPromise: Promise<Barretenberg> | undefined;
let noirModulePromise: Promise<ServerNoirModule> | undefined;

type ServerNoirModule = {
  Noir: new (circuit: unknown) => {
    execute(inputs: NoirInputMap): Promise<{ witness: Uint8Array }>;
  };
};

const getCircuit = (circuitName: ProofRequest["circuitName"]) => {
  const circuit = circuitManifest[circuitName];
  if (!circuit) {
    throw new Error(`Unknown circuit: ${circuitName}`);
  }

  return circuit;
};

const getServerNoir = () => {
  noirModulePromise ??= Promise.resolve().then(() => {
    // Force the Node/CJS NoirJS entrypoint so Next does not bundle the web WASM runtime.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@noir-lang/noir_js") as ServerNoirModule;
  });

  return noirModulePromise;
};

const resolveBbWasmPath = () => {
  const candidatePaths = [
    path.resolve(
      process.cwd(),
      "node_modules/@aztec/bb.js/dest/node-cjs/barretenberg_wasm/barretenberg-threads.wasm.gz",
    ),
    path.resolve(
      process.cwd(),
      "../node_modules/@aztec/bb.js/dest/node-cjs/barretenberg_wasm/barretenberg-threads.wasm.gz",
    ),
    path.resolve(
      process.cwd(),
      "packages/nextjs/node_modules/@aztec/bb.js/dest/node-cjs/barretenberg_wasm/barretenberg-threads.wasm.gz",
    ),
  ];

  return candidatePaths.find(candidatePath => existsSync(candidatePath));
};

const getServerApi = () => {
  serverApiPromise ??= (async () => {
    const useNativeBackend = process.env.NOIR_SERVER_BACKEND === "native";
    const baseOptions = {
      threads: Number(process.env.NOIR_SERVER_THREADS || (useNativeBackend ? 2 : 1)),
      crsPath: process.env.BB_CRS_PATH,
    };
    const wasmPath = process.env.BB_WASM_PATH || resolveBbWasmPath();

    if (useNativeBackend) {
      return await Barretenberg.new({
        ...baseOptions,
        backend: BackendType.NativeUnixSocket,
      });
    }

    return await Barretenberg.new({
      ...baseOptions,
      backend: BackendType.Wasm,
      wasmPath,
    });
  })();

  return serverApiPromise;
};

export const proveOnServer = async <TInputs extends NoirInputMap>(
  request: ProofRequest<TInputs>,
): Promise<ProofResponse> => {
  const circuit = getCircuit(request.circuitName);
  const { Noir } = await getServerNoir();
  const api = await getServerApi();
  const noir = new Noir(circuit as any);
  const backend = new UltraHonkBackend(circuit.bytecode, api);
  const { witness } = await noir.execute(request.inputs);
  const proofSettings = { verifierTarget: "evm" as const };
  const { proof, publicInputs } = await backend.generateProof(witness, proofSettings);
  const verified = await backend.verifyProof({ proof, publicInputs }, proofSettings);

  return {
    circuitName: request.circuitName,
    proof: normalizeProof(proof),
    publicInputs: normalizePublicInputs(publicInputs),
    verified,
    backend: circuit.backend,
    noirVersion: circuit.noirVersion,
    proofFlavor: circuit.proofFlavor,
    mode: "server",
  };
};
