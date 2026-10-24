# Program and API

## Program

| Instruction                    | Who                                     | What                                                                                                                                                                             |
| ------------------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize` / `update_config` | admin                                   | proposer, treasury owner, fee (≤ 10 % hard cap), early-bird, dispute window, min bet, pause                                                                                      |
| `create_market`                | admin or proposer                       | stock mint, metric tag, question hash, thresholds + range count, open/close/resolve times; creates the vault                                                                     |
| `seed_market`                  | anyone                                  | add a fee-free prize in the market's stock                                                                                                                                       |
| `place_bet`                    | anyone                                  | range index + amount of the stock; fee rate locked into the position                                                                                                             |
| `propose_resolution`           | proposer or admin                       | observed move + evidence hash; range derived on-chain; starts the dispute window                                                                                                 |
| `finalize_resolution`          | anyone after the window, admin any time | locks the outcome                                                                                                                                                                |
| `void_market`                  | admin                                   | refund everyone                                                                                                                                                                  |
| `void_stale_market`            | proposer or admin                       | refund everyone in a market still unproposed 24 h after its resolve time                                                                                                         |
| `settle_position`              | anyone                                  | pay one position in the stock, close it, refund its rent to the payer                                                                                                            |
| `forfeit_position`             | anyone after 30 days, admin any time    | only if the owner's token account is gone, frozen or set to require memos: the payout goes to the treasury, the position closes                                                  |
| `sweep_market`                 | anyone                                  | after all positions are settled: fees + dust to the treasury's account for that stock, close the vault and the market account; their rent goes back to the proposer that paid it |

Program id: `GDXeN1j6JkU6brXhvT7BvDrJV2TLnMC3XWotCoAPnLzH`.

## Automation: the API and the program

A bot needs three things: which pools are open, a way to bet, and the results. The first and the third are the
public read API (no key, open CORS); the second is the program, signed by the bot's own wallet. There is no
server-side bet endpoint, so nobody can bet with your tokens but you.

| Endpoint                                    | What                                                                                                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/markets`, `GET /api/markets/<id>` | every market / one market. `status`: 0 open, 1 proposed, 2 resolved, 3 voided, 4 settled and swept. A bet is accepted while status is 0 and now is between `openTs` and `closeTs` (unix seconds) |
| `GET /api/config`                           | fee, early-bird discount, dispute window, minimum bet (base units)                                                                                                                               |
| `GET /api/stocks`, `GET /api/prices`        | the tokens with mints and decimals; the live prices the site shows                                                                                                                               |
| `GET /api/evidence/<id>`, `…/raw`           | the settlement evidence; `/raw` is the exact bytes whose sha256 is on-chain                                                                                                                      |
| `GET /api/positions/<wallet>`               | every payout the crank pushed to a wallet, with its signature                                                                                                                                    |
| `GET /api/leaderboard?window=7d\|30d\|all`  | the points board                                                                                                                                                                                 |
| `POST /api/faucet {"address"}`              | devnet only: mock shares of every open pool plus a little SOL, once a day per wallet                                                                                                             |

Units: `thresholds` and the observed move `proposedValue` are in ppm (1 % = 10 000); range 0 is below the first
threshold, the last range at or above the last one, `outcome` is the winning range. `pools` and bet amounts are in base
units (shares × 10^`decimals`). Betting is the program's `place_bet(range, amount)` instruction (IDL in `idl/`);
payouts are pushed to the wallet after the dispute window, nothing to claim. Market data is cached for 15 s; the
faucet, disputes and feedback are limited per address and per day.

[`tools/automate.mjs`](../tools/automate.mjs) does all of it in 80 lines (Node 22, `pnpm install` once):

```sh
node tools/automate.mjs markets                 # open pools: id, ranges, closes in, pool sizes
node tools/automate.mjs bet 153 1 0.5           # 0.5 shares on range 1 of market #153, signed by KEYPAIR
node tools/automate.mjs results <wallet>        # settled markets, and what that wallet was paid
```
