# BellPot — bet with your stock tokens, get paid in them

Daily parimutuel pools on US stocks where **the stake and the payout are the tokenized stock itself** — any issuer's
token on Solana: xStocks (SPCXx, TSLAx, NVDAx, SPYx), Backpack Securities (SPCX) and Ondo Global Markets (SPCXon,
TSLAon, NVDAon, SPYon). Holders put their shares to work without selling them:

- **Hedge without selling.** Hold 10 TSLAx and worried about today? Stake 1 TSLAx on "Big drop". If Tesla falls hard,
  you receive extra TSLAx on exactly the day your shares lose value.
- **Add upside without buying.** Stake on "Big gain" instead and a win adds shares on the day the price jumps.
- A wrong call costs only what you staked. You never swap out of the stock, so you never leave your position.

Built for the Solana Foundation **Stocklana** hackathon (September 2026).

**Try it (devnet): <https://devnet.bellpot.xyz>** — connect Phantom / Solflare / Backpack set to devnet, or use the built-in
browser test wallet, then press "Get test tokens": every wallet gets mock tokens of every pool open today plus a little
SOL for fees. A new stock pool opens for every token at each US opening bell; a pre-IPO or meme day's pool opens at
11:00 UTC the day before.

Updates: [@bellpotxyz on X](https://x.com/bellpotxyz) · contact: hello@bellpot.xyz

## Quick start

```bash
pnpm install                     # one lockfile for every package
pnpm test                        # server unit tests (node:test)
pnpm build                       # the Next.js site
pnpm typecheck && pnpm lint
```

Contracts build and test separately: `cd contracts/solana && anchor build`, then `./tools/test-local.sh` for the
integration suite. The full local cluster (mock tokens, faucet, markets, a settlement in minutes) is in
[docs/development.md](docs/development.md).

## Repository

```
contracts/solana           Anchor program (Rust): per-token parimutuel pools, Token-2022, on-chain range derivation
  programs/bellpot         the program
  tests/bellpot.ts         integration tests against a local validator with mock xStocks carrying the real TSLAx extension set
apps/server                market opener (NYSE calendar), resolver + settlement crank, API, devnet faucet, SSR
apps/web                   Next.js site: markets, Wallet Standard betting (Phantom, Solflare, Backpack), "My bets"
packages/contracts         the program IDL and its TypeScript types — one import for the server, the web app and the tools
packages/i18n              the six language dictionaries, shared by the server and the browser bundle
tools                      devnet bootstrap, replay markets, admin tools, the automation example, the test runner
deploy                     pm2, cron and Caddy configuration
```

## Documentation

| Document                                   | What it covers                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [docs/markets.md](docs/markets.md)         | how a market works, issuers, dividends and splits, the money model, points, invites, tokens |
| [docs/settlement.md](docs/settlement.md)   | the resolver, evidence, the dispute window, the second machine, the trust model             |
| [docs/api.md](docs/api.md)                 | the read API, the instruction set, units, the automation example                            |
| [docs/development.md](docs/development.md) | local setup, the test suites, the checks, languages and i18n                                |
| [docs/deploy.md](docs/deploy.md)           | hosts, pm2, cron, secrets, cutover and rollback                                             |

## Status and next steps

- devnet: the program id is `GDXeN1j6JkU6brXhvT7BvDrJV2TLnMC3XWotCoAPnLzH`. It has not been deployed under this id
  yet: keep the keypair at `secrets/program/bellpot.json` backed up, then run `tools/deploy-devnet.sh`, which deploys
  the program and bootstraps the mock tokens, faucet and config. The previous deployment is retired.
- Next: weekend markets on the 24/7 xStock price, mainnet with real xStocks after an audit, upgrade authority and
  treasury behind a Squads multisig.

## License

MIT
