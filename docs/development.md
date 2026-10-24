# Development

## Languages

The site speaks English, 繁體中文, 简体中文, 日本語, 한국어 and Español. Next.js picks one per request — a `?lang=`
link, then the picker's cookie, then the browser's `Accept-Language` — and renders the page in that language.
Dictionaries are plain JSON in `packages/i18n/`; `apps/server/src/i18n/catalog.test.ts` fails if a language misses a key, a
`{slot}` or a tag. Adding a language is two JSON files and one row in `packages/i18n/langs.json`.

## Running it locally

```bash
pnpm install                                  # one lockfile, every workspace package

# the program and its integration tests
(cd contracts/solana && anchor build)
pnpm sync:idl                                 # copies the built IDL into packages/contracts
./tools/test-local.sh                         # fresh validator + the integration tests

# a local cluster with mock xStocks, a faucet and today's markets
solana-test-validator --reset --bpf-program GDXeN1j6JkU6brXhvT7BvDrJV2TLnMC3XWotCoAPnLzH contracts/solana/target/deploy/bellpot.so &
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json
BELLPOT_SECRETS=./.local pnpm --filter @bellpot/tools setup-devnet
CLUSTER=localnet STATE=./.local/state.json node --experimental-strip-types apps/server/src/markets/open.ts
NEXT_PUBLIC_CLUSTER=localnet pnpm build
CLUSTER=localnet BELLPOT_SECRETS=./.local CLUSTER_RPC=http://127.0.0.1:8899 node --experimental-strip-types apps/server/src/http/server.ts   # API on :5041
API_ORIGIN=http://127.0.0.1:5041 pnpm --filter @bellpot/web start                                         # site on :3000

# watch a full cycle in minutes: a market on a past session, resolved from its real official close
SYMBOL=TSLA SESSION=2026-09-11 BET_SECS=120 CLUSTER=localnet STATE=./.local/state.json node tools/quick-market.mjs
CLUSTER=localnet BELLPOT_SECRETS=./.local ADMIN_FINALIZE=1 ADMIN_KEYPAIR=$ANCHOR_WALLET node --experimental-strip-types apps/server/src/markets/resolve.ts

# the checks CI runs
pnpm test && pnpm typecheck && pnpm lint
```
