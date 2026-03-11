#!/bin/bash

set -euo pipefail

if ! command -v nargo >/dev/null 2>&1; then
  echo "nargo could not be found"
  exit 2
fi

echo "Running Noir circuit tests..."
for circuit_dir in circuits/*/; do
  circuit_name=$(basename "$circuit_dir")
  echo " - ${circuit_name}"
  (
    cd "$circuit_dir"
    nargo test
  )
done
