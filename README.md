# Scaffold-ETH 2 Noir Starter

Scaffold-ETH 2 + Noir starter for shipping full-stack zk apps without rebuilding the same proving, verifier, and deployment plumbing every time.

This repo rebases the old `scaffold-eth-2-noir` idea onto a modern Scaffold-ETH 2 app and pins the Noir stack to a tested compatibility tuple:

- `Node`: `22.x` recommended
- `nargo` / `noirc`: `1.0.0-beta.19`
- `@noir-lang/noir_js`: `1.0.0-beta.19`
- `bb` CLI: `4.0.0-nightly.20260120`
- `@aztec/bb.js`: `4.0.0-nightly.20260120`
- proving system: `Ultra Honk`
- Solidity verifier export: `bb write_vk --oracle_hash keccak` + `bb write_solidity_verifier`

The starter ships one sample app, `zk-age-proof`, but the reusable part is the infrastructure around it:

- typed circuit manifest shared by the frontend and deployment flow
- browser-first proof generation with a server fallback route
- deterministic verifier generation for each circuit
- Hardhat deployment wiring for generated verifier libraries
- on-chain verification example wired to real proof/public-input outputs

## Core Profile

The default install is now a smaller core starter rather than a full Scaffold-ETH kitchen sink. The shipped profile keeps the zk app path and removes optional SE2 convenience layers from the default dependency graph:

- removed from default: debug contracts route
- removed from default: burner wallet integration
- removed from default: faucet UI helpers
- removed from default: Vercel and IPFS deployment helper tooling

Some SE2 surfaces are still present in source, such as the local block explorer, because they do not currently dominate the package graph. The next reduction step would be replacing `@scaffold-ui/components` with local equivalents, which would let the core profile drop `@scaffold-ui/hooks` too.

## What Changed

The legacy stack used old Noir packages, `@noir-lang/backend_barretenberg`, and `nargo codegen-verifier`. This repo now uses:

- current Scaffold-ETH 2 app and Hardhat packages
- App Router Next.js frontend
- `Noir` + `UltraHonkBackend` proving flow from NoirJS / bb.js
- generated circuit manifest instead of an ad hoc `circuits.json`
- `bb`-generated EVM verifiers instead of legacy `nargo` Solidity verifier codegen

## Quickstart

1. Install Node 22 and Yarn.
2. Install Noir `1.0.0-beta.19`.
3. Install the matching `bb` version:

```bash
bbup -v 4.0.0-nightly.20260120
```

4. Install workspace dependencies:

```bash
yarn install
```

The first install on a machine may fetch platform-specific optional packages such as Next SWC binaries.

5. Start a local chain:

```bash
yarn chain
```

6. In a second terminal, export circuits and deploy contracts:

```bash
yarn deploy
```

7. In a third terminal, start the app:

```bash
yarn start
```

Open [http://localhost:3000](http://localhost:3000) and visit `/zk-age-proof`.

## Main Commands

```bash
yarn noir:test            # run nargo tests for all circuits
yarn noir:export          # compile circuits, generate manifest, generate Solidity verifiers
yarn hardhat:test         # prove in Node and verify on-chain
yarn next:check-types     # typecheck the frontend
yarn next:build           # production build
```

## Repository Layout

- `packages/noir`: Noir circuits, artifact export, verifier export, circuit manifest generation
- `packages/hardhat`: generated verifiers, deploy scripts, contracts, on-chain tests
- `packages/nextjs`: SE2 frontend, browser/server proof service, sample app

## Proving Model

The frontend exposes two proving modes through one shared interface:

- `browser`: default path, runs proving in the client with `bb.js`
- `server`: fallback path, posts the same request shape to `/api/noir/prove`

The proving response shape is:

```ts
type ProofResponse = {
  proof: `0x${string}`;
  publicInputs: `0x${string}`[];
  verified: boolean;
  backend: string;
  noirVersion: string;
  proofFlavor: string;
  mode: "browser" | "server";
};
```

`publicInputs` come directly from the proving backend, so contracts consume the exact ordered values used for verification.

## Circuit Export Pipeline

`yarn noir:export` does three things:

1. compiles every circuit with `nargo compile`
2. generates `packages/nextjs/lib/noir/generated/circuitManifest.ts`
3. generates Solidity verifiers with:

```bash
bb write_vk -b target/<circuit>.json -o target --oracle_hash keccak
bb write_solidity_verifier -k target/vk -o target/<Circuit>Verifier.sol
```

During export, each verifier file is normalized so every circuit gets unique Solidity symbol names. That avoids collisions once you add more than one verifier to `packages/hardhat/contracts/verifiers`.

## Add A Circuit

1. Create a circuit:

```bash
cd packages/noir
nargo new circuits/MyCircuit
```

2. Set the circuit `compiler_version` in `packages/noir/circuits/MyCircuit/Nargo.toml` to match the pinned Noir toolchain.
3. Write the circuit and its `nargo test` coverage.
4. Run:

```bash
yarn noir:export
```

5. Consume the new entry from `packages/nextjs/lib/noir/generated/circuitManifest.ts`.
6. Build a typed input adapter and call the shared proof service.
7. Wire the generated verifier deployment into your application contract flow.
8. Add a Hardhat test that generates a proof and verifies it on-chain.

## Production Notes

- Browser proving requires cross-origin isolation headers. They are already enabled in `packages/nextjs/next.config.ts`.
- Large circuits may exceed browser memory or thread budgets. Use the `server` proving mode for fallback.
- This starter is intended for EVM chains where the generated verifier works with the required precompiles.
- zkSync Era and Polygon zkEVM are not marked as supported by default in this repo.

## Validation

The updated starter has been checked with:

- `yarn noir:export`
- `yarn hardhat:compile`
- `yarn hardhat:test`
- `yarn next:check-types`
- `yarn next:build`

Hardhat coverage includes a valid proof path and a rejection path where the submitting wallet does not match the encoded public inputs.
