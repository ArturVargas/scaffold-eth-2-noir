# Noir Package

This package owns the circuit toolchain for the starter.

## Pinned Toolchain

- `nargo` / `noirc`: `1.0.0-beta.19`
- `bb`: `4.0.0-nightly.20260120`

Keep the circuit `compiler_version` aligned with that tuple. If you change Noir, update the matching `bb` version too.

## Commands

```bash
yarn compile            # compile every circuit
yarn test               # run nargo tests for every circuit
yarn export:artifacts   # compile circuits and generate the TS/JSON manifest
yarn export:verifiers   # compile circuits and export Solidity verifiers
yarn export             # artifacts + verifiers
```

## Output

`yarn export` generates:

- `generated/circuitManifest.json`
- `../nextjs/lib/noir/generated/circuitManifest.ts`
- `../hardhat/contracts/verifiers/*Verifier.sol`

Each manifest entry includes:

- `circuitName`
- `abi`
- `bytecode`
- `noirVersion`
- `backend`
- `proofFlavor`
- `artifactPath`
- `verifierPath`
- `verifierContractName`

## Verifier Export

Verifier generation uses the modern `bb` flow:

```bash
nargo compile
bb write_vk -b target/<circuit>.json -o target --oracle_hash keccak
bb write_solidity_verifier -k target/vk -o target/<Circuit>Verifier.sol
```

The export script then rewrites top-level Solidity symbols so every circuit gets unique verifier and library names. That keeps multi-circuit projects compilable inside one Hardhat package.

## Adding Circuits

1. `nargo new circuits/MyCircuit`
2. update `Nargo.toml`
3. write the circuit and tests
4. run `yarn export`
5. consume the generated manifest entry from the frontend and deployment flow
