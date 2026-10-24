#!/usr/bin/env bash
# Deploy the program to devnet from the dedicated deployer wallet, then bootstrap mock xStocks, the faucet and config.
# Peak need is ~5.1 SOL (upload buffer + program data, 360 KB each); ~2.5 SOL stays locked as program rent, the buffer
# is refunded, and the bootstrap spends ~0.75 SOL (proposer 0.2, faucet 0.5, mint/account rent).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SECRETS="${BELLPOT_SECRETS:-$ROOT/secrets/devnet}"
DEPLOYER="${DEPLOYER_KEYPAIR:-$SECRETS/deployer.json}"
# RPC carries an API key: never echo it; mask it in any output. Read from $DEVNET_RPC or $SECRETS/rpc-url.
RPC="${DEVNET_RPC:-$(cat "$SECRETS/rpc-url" 2>/dev/null || true)}"
[ -n "$RPC" ] || { echo "set DEVNET_RPC or write the URL to $SECRETS/rpc-url"; exit 1; }
[ -f "$DEPLOYER" ] || { echo "no deployer keypair at $DEPLOYER"; exit 1; }
mask() { sed -E 's#https?://[^ ]+#<rpc>#g'; }

BAL=$(solana balance -k "$DEPLOYER" -u "$RPC" 2>&1 | awk '{print $1}')
echo "deployer $(solana-keygen pubkey "$DEPLOYER") balance: $BAL SOL"
if ! awk -v b="$BAL" 'BEGIN { exit !(b + 0 >= 5.1) }'; then echo "need at least 5.1 SOL for the deploy peak — fund the deployer first"; exit 1; fi

cd "$ROOT/contracts/solana"
if solana program show GDXeN1j6JkU6brXhvT7BvDrJV2TLnMC3XWotCoAPnLzH -u "$RPC" >/dev/null 2>&1; then
  echo "program already deployed — upgrading"
fi
solana program deploy target/deploy/bellpot.so --program-id target/deploy/bellpot-keypair.json -k "$DEPLOYER" -u "$RPC" --use-rpc 2>&1 | mask

mkdir -p "$SECRETS" && chmod 700 "$SECRETS"
ANCHOR_PROVIDER_URL="$RPC" ANCHOR_WALLET="$DEPLOYER" BELLPOT_SECRETS="$SECRETS" FAUCET_FUND_SOL=0.5 \
  pnpm --dir "$ROOT" --filter @bellpot/tools setup-devnet 2>&1 | mask
solana balance -k "$DEPLOYER" -u "$RPC" 2>&1 | mask
