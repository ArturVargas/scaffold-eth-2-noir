#!/bin/bash

set -euo pipefail

if ! command -v bb >/dev/null 2>&1; then
  echo "bb could not be found"
  exit 2
fi

if ! command -v nargo >/dev/null 2>&1; then
  echo "nargo could not be found"
  exit 2
fi

TARGET_DIR="../hardhat/contracts/verifiers"
mkdir -p "$TARGET_DIR"
find "$TARGET_DIR" -type f -name '*.sol' -delete

echo "Generating Solidity verifiers with bb..."
for circuit_dir in circuits/*/; do
  circuit_name=$(basename "$circuit_dir")
  artifact_path="${circuit_dir}target/${circuit_name}.json"
  verifier_target="${TARGET_DIR}/${circuit_name}Verifier.sol"

  echo " - ${circuit_name}"
  (
    cd "$circuit_dir"
    nargo compile
    bb write_vk -b "target/${circuit_name}.json" -o target --oracle_hash keccak
    bb write_solidity_verifier -k target/vk -o "target/${circuit_name}Verifier.sol"
    yarn tsx ../../scripts/normalize_verifier.ts "target/${circuit_name}Verifier.sol" "${circuit_name}"
  )

  cp "${circuit_dir}target/${circuit_name}Verifier.sol" "$verifier_target"
done
