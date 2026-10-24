#!/usr/bin/env bash
# Localnet test run: a fresh validator with the program preloaded, then mocha. Leaves nothing running.
# The wallet must exist and be funded by the validator (--mint). ANCHOR_WALLET overrides the default.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts/solana"

PROGRAM_ID=GDXeN1j6JkU6brXhvT7BvDrJV2TLnMC3XWotCoAPnLzH
WALLET="${ANCHOR_WALLET:-$HOME/.config/solana/id.json}"
LEDGER="${LEDGER_DIR:-${TMPDIR:-/tmp}/bellpot-ledger}"
RPC=http://127.0.0.1:8899

[ -f "$WALLET" ] || { echo "no wallet at $WALLET — create one with: solana-keygen new"; exit 1; }

rm -rf "$LEDGER"
solana-test-validator --reset --quiet --ledger "$LEDGER" --mint "$(solana-keygen pubkey "$WALLET")" \
  --bpf-program "$PROGRAM_ID" target/deploy/bellpot.so > "$LEDGER.log" 2>&1 &
VPID=$!
trap 'kill "$VPID" 2>/dev/null; wait "$VPID" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  solana -u "$RPC" cluster-version >/dev/null 2>&1 && break
  sleep 1
done

ANCHOR_PROVIDER_URL="$RPC" ANCHOR_WALLET="$WALLET" pnpm exec ts-mocha -p ./tsconfig.json -t 180000 "tests/**/*.ts"
