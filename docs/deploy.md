# Deployment

The product runs on one app host plus one independent verifier host. Neither holds treasury money.

## Layout on the app host

```
/home/bellpot/
├─ apps/bellpot/            git checkout of this repository
├─ secrets/devnet/          state.json, proposer.json, faucet.json, rpc-url   (mode 700)
├─ data/                    markets, settlements, evidence, ticks            (DATA_DIR)
├─ logs/                    one log per cron job and the API
└─ locks/                   flock files for the cron jobs
```

The app host signs with the **proposer** and **faucet** keys only. The admin key, the upgrade authority and the treasury
key live elsewhere; `deploy/referral-payout-remote.sh` runs on the machine that keeps the treasury key.

## Processes

`deploy/ecosystem.config.cjs` starts the API (name `bellpot-api`, `127.0.0.1:5041`) and serves the built site from
`apps/web/dist`. `deploy/crontab.txt` installs the jobs:

| Job               | Schedule     | What                                          |
| ----------------- | ------------ | --------------------------------------------- |
| `open-markets`    | every 30 min | keeps one market per listed token open        |
| `sample-prices`   | every minute | Jupiter quotes for on-chain-close markets     |
| `select-chain`    | 11:00 UTC    | picks tomorrow's ten most-traded memes        |
| `resolve`         | every 10 min | proposes, finalizes and pays out              |
| `heartbeat-check` | every 10 min | alerts when the verifier host stops reporting |

Every job runs under `flock -n` on its own lock file: a slow run must never overlap the next tick (two openers open a
market twice, two resolvers record a payout twice).

Caddy terminates TLS and forwards the site to the Next.js process and `/api/*` to the API process
(`deploy/Caddyfile.snippet`); the apex redirects to `devnet.bellpot.xyz` until a mainnet deployment exists.

## First deployment

```bash
# 1. the program (needs a deployer keypair with ~5.1 SOL; ~2.5 SOL stays locked as program rent)
solana-keygen new -o secrets/program/bellpot.json     # only once — back this file up, it is the upgrade authority's program key
DEPLOYER_KEYPAIR=secrets/devnet/deployer.json DEVNET_RPC=... ./tools/deploy-devnet.sh
# it deploys contracts/solana/target/deploy/bellpot.so, then bootstraps mints, faucet, proposer and config

# 2. the site
pnpm install --frozen-lockfile
NEXT_PUBLIC_CLUSTER=devnet pnpm build

# 3. the API
pm2 start deploy/ecosystem.config.cjs && pm2 save

# 4. the jobs
crontab deploy/crontab.txt
```

Smoke test, in order: `curl localhost:5041/api/markets` returns markets, the site loads, the faucet sends mock tokens,
a bet lands, and `tools/quick-market.mjs` plus the resolver pay it out.

## Cutover from an older deployment

1. **Stop the old crontab and the old pm2 app first.** The lock files are per path, so an old and a new deployment do
   not exclude each other: two openers can open the same market twice and two resolvers can pay a position twice.
2. Create the `bellpot` user and clone this repository into `/home/bellpot/apps/bellpot`.
3. Copy `data/` (or start fresh) and place the **new** program keypair and the proposer/faucet keys in `secrets/`.
4. `pnpm install --frozen-lockfile && NEXT_PUBLIC_CLUSTER=devnet pnpm build`.
5. Deploy the program under the new id, bootstrap it, start pm2 and install the crontab.
6. Run the smoke test above; only then remove the old deployment and archive its `data/`.

Rollback: `git revert` the change, restore the previous `deploy/` configuration, `pm2 restart`, `crontab` the old file.
The program under the previous id remains deployed and its accounts are untouched by a client-side revert.

## Secrets

| File                              | Used by                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| `secrets/program/bellpot.json`    | program deploy / upgrades only (keep offline)                           |
| `secrets/<cluster>/state.json`    | mock mints, config address, proposer and faucet addresses               |
| `secrets/<cluster>/proposer.json` | open-markets, resolve, select-chain                                     |
| `secrets/<cluster>/faucet.json`   | the API's faucet route                                                  |
| `secrets/<cluster>/rpc-url`       | a private RPC endpoint (optional; public devnet rate-limits settlement) |

`secrets/` is gitignored. Never put a key in `.env`.

## Verifier host

`apps/server/src/markets/verify.ts` runs every ten minutes on a different machine that holds the admin key. It
re-derives every proposed result from its own sources and voids a proposal it cannot reproduce (a full refund, never a
different winner). `apps/server/src/ops/heartbeat.ts` on the app host alerts when that machine stops reporting.
