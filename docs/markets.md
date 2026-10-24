# Markets

## How a market works

- **One market per stock per US trading session.** The market for session S opens at the previous session's opening
  bell and **stops taking bets at S's opening bell (09:30 New York)**, so there is always exactly one pool per stock you
  can bet into, around the clock.
- It settles on the **official close of S against the official close of the session before**, in four ranges:
  big drop / small drop / small gain / big gain. The cuts are set near the quartiles of each stock's daily moves over
  the last 12 weeks (TSLA −1.75 % / 0 / +2 %, NVDA −1.5 % / 0 / +2.25 %, SPY −0.5 % / 0 / +0.5 %), so every range
  starts out roughly equally likely. Odds then move with the pools.
- Session times come from the NYSE holiday calendar built into the server (holidays, early closes, daylight saving;
  checked session by session against a broker's market calendar for the rest of 2026). Before it opens a market the
  opener also asks Nasdaq's live market status for the next session and follows Nasdaq if the two disagree (an
  unscheduled closure). Years beyond the published table are generated from the exchange's standing holiday rules
  (`nyseYearByRule`, tested against NYSE's published lists for 2022 and 2024–2027), so nothing is added by hand each year.

## Many issuers, one question

The same stock often trades on Solana as several tokens: SpaceX as SPCXx (xStocks), SPCX (Backpack Securities) and
SPCXon (Ondo Global Markets); Tesla as TSLAx and TSLAon. The tokens are not interchangeable (different issuers,
decimals and dividend multipliers), so **each token gets its own pool**. All pools of a stock ask the same question and
resolve on the same official close; each is staked and paid in its own token.

## Dividends, splits and other corporate actions

- **What is predicted is the total-return move**: (close + any dividend going ex that session) ÷ previous close − 1,
  with both closes on the same share basis. An ex-dividend day therefore doesn't count as a drop (SPY 2026-06-18: price
  +0.78 %, total return +1.04 %), and a split doesn't show up as a −90 % day (NVDA's 10-for-1 on 2024-06-10 settles at
  +0.75 %). The dividend and split lines are part of the published raw price data.
- **The tokens themselves** carry dividends and splits as a `ScaledUiAmount` multiplier that the issuer applies to every
  balance, vaults included. The program books raw units, so every stake, pool and payout moves by the same ratio and
  keeps its share of the pot; the site shows amounts with the multiplier applied, exactly as wallets do.
- New shares issued for cash are a real price move and count. Stock dividends and bonus issues are splits; capital
  reductions are reverse splits or cash returns, handled as above.
- Anything that can't be expressed this way — a spin-off, a merger that delists the stock, a halt for the whole
  session — voids the market and refunds every stake in full.

## How the money works

- Each range has its own pool, denominated in the market's stock token. **Winners get their stake back plus a pro-rata
  share of every losing pool**, paid in the same stock.
- **The fee (3 %) is charged only on what a winner takes from the losing pools**, never on the winner's own stake.
  Bets in the first quarter of the betting window (up to 6 h) pay 2 %. The rate is locked into the position when you
  bet, stake-weighted, so a late top-up cannot inherit an early rate.
- **Fees are collected in the stock itself.** A pool staked in NVDAx pays its fee in NVDAx, swept to that token's
  treasury account.
- **There is no house prize** on any network (`seed_market` exists for a deliberate promotion, switched on with
  `SEED_MARKETS=1`). If nobody picked the winning
  range, everyone is refunded; a **voided** market refunds everyone in full.
- Payouts are **pushed** to wallets by a permissionless crank after the dispute window. Nobody has to claim.
- **The one case the crank cannot pay**: the owner's token account for that stock was closed, frozen, or set to require a memo on incoming transfers after the bet.
  The crank reopens a closed account at its own cost when the payout is worth at least $0.50; a smaller one waits for
  the owner to reopen it. A position still unpayable 30 days after resolution can be forfeited to the treasury
  (`forfeit_position`; the program checks both the delay and the account), so a market can always be closed. The site
  asks for stakes of about $1 or more for the same reason.

## Why this works with no house money

BellPot is parimutuel, so **there is no house on the other side of your bet** — the players are each other's
counterparty. Three consequences worth stating plainly, because "who pays me if I win?" is the first question anyone
asks:

- **Nobody needs to fund the prize.** Winners are paid out of the losing ranges, which is money players put in
  themselves. The program never owes more than the vault holds.
- **A market with no counterparty cannot lose you money.** If everyone picks the same range, the losing pools are
  empty and every stake comes back. If nobody picks the winning range, everyone is refunded and no fee is charged
  (`compute_payout` in [`contracts/solana/programs/bellpot/src/lib.rs`](../contracts/solana/programs/bellpot/src/lib.rs)). The worst case is a wasted
  session, not a loss.
- **The cold-start problem is about depth, not solvency.** Splitting a day's volume across 9 pools × 4 ranges makes
  every range look thin, which is why a mainnet launch starts with one or two pools rather than all nine.

## Leaderboard

Every settled market scores the wallets that were in it:

    points = shares staked × the official close the market settled on

That is what the stake was worth, in dollars, at settlement. Every range you bet counts, won or lost: one share on
each of the four ranges of a $212 close is 848 points, and only one of them can pay. The close is the one in the
evidence file the result was derived from, so NVDAx and NVDAon score alike and no token quote is involved. It is
frozen into the settlement record at payout time (`apps/server/src/markets/resolve.ts`); `apps/server/src/referrals/points.ts` only adds up what the
crank wrote. The board is at `/leaderboard.html`, backed by `GET /api/leaderboard?window=7d|30d|all`.

## Invite links

Anyone who has placed a bet gets a link (`/?ref=CODE`, code derived from the wallet address). A wallet that arrives
through it and places its **first** bet is bound to that code — the wallet signs the binding, so nobody can claim
someone else's wallet, and the file is keyed by address, so the binding holds on devnet and mainnet alike.

Fees are charged on winnings only, in the pool's token. When a bound wallet's winning bet settles, the referrer earns
20 % of that fee (25 % from 10 000 all-time points, 30 % from 100 000) and the invitee gets 10 % of it back, both in
the same token. `deploy/referral-payout-remote.sh` pays the balance out once a week straight from the treasury (rebates are a
share of collected fees, so it always holds enough), from the machine that keeps the treasury key, never the app host;
before a settlement row earns anyone a rebate the payer finds its transaction on-chain and requires this program's
`PositionSettled` event for the same market, owner and fee (`apps/server/src/markets/proof.ts`), so the app host's files
cannot invent fees; one run never sends more than $2,000 without a human; a wallet that does not hold the token yet
gets its account opened once the rebate reaches $10.
`data/referral-payouts.jsonl` is the ledger, `data/referrals.json` the bindings, and everything else is recomputed from
`settlements.jsonl` so nothing is counted twice. Rules and maths: `apps/server/src/referrals/ledger.ts` (tests in
`ledger.test.ts`).

## Built for xStocks specifically

xStocks are Token-2022 mints with several extensions. The program and the tests take each of them into account:

- **Token-2022 transfers.** Every movement uses `transfer_checked` through the token interface; classic SPL mints work
  through the same path.
- **One mint per market.** Each market records its stock mint; bets, payouts and fee sweeps must use that mint and the
  matching token accounts (wrong mint, wrong wallet or wrong treasury account are rejected).
- **Extension-aware vaults.** Vault accounts are sized for whatever account extensions the mint requires.
- **Booked at what arrives.** `place_bet` and `seed_market` record the vault's balance change, not the amount sent,
  so mints with a transfer fee (Tessera, PreStocks) run pools that never exceed their vault. Only an active transfer
  hook is refused at `create_market`. xStocks, Ondo Global Markets and Backpack Securities tokens carry neither; the
  program itself is issuer-agnostic.
- **Dividends and splits.** All accounting is in raw units, so a `ScaledUiAmount` multiplier change scales every pool,
  stake and payout alike (tested mid-market).
- **Issuer controls, disclosed.** The issuer holds a permanent delegate, a pause switch and an (empty) transfer-hook
  slot on every xStock. It can move or freeze tokens in any account, these vaults included; while a mint is paused no
  bet, payout or sweep for it can move. The tests pause and resume a mint mid-market and show that everything settles
  correctly afterwards. The site states this on every page.

## Pre-IPO tokens and memes: the same pool, an on-chain close

Two more token classes run on the same program. There is no exchange for them, so **a day's close is read on-chain**:

- **Pre-IPO**: T-OpenAI and T-Kalshi (Tessera) and OpenAI (PreStocks), one pool per token per UTC day. The pool
  settles on the token's on-chain price, the only price anyone can actually trade at.
- **Memes**: `apps/server/src/markets/select.ts` runs at 11:00 UTC and picks the ten Solana tokens with the most 24-hour traded
  volume (Jupiter's top-traded list) for the next day, subject to filters: mint and freeze authority given up, liquidity
  ≥ $500k, first pool ≥ 3 days old, no wrapped/bridged assets, no tokenized stocks, DeFi or "strict"-list tokens.
  They are recorded in `data/chain-tokens.json`; on devnet the opener mints a mock per token and stocks the faucet.
- **Close** = median of one Jupiter quote per minute during the day's last hour (23:00–24:00 UTC), sampled by
  `apps/server/src/markets/sample.ts` into `data/ticks/<date>.jsonl`. Metric tag `<SYMBOL>.day:<date>`; the move is that day's
  close against the previous day's, both read from the samples at resolution and published together as evidence.
  Fewer than 40 usable quotes on either day voids the market (full refund). Jupiter is the one settlement source —
  the same feed the site shows as "now" and "prev close". Every sample also records a second quote (DexScreener),
  published with the evidence for comparison only: two venues trade at different prices, so it never decides or
  holds a market.
- **Three ranges** (down / flat / up) cut at ± the token's median absolute daily move over 60 days (GeckoTerminal).
  A day's pool opens at 11:00 UTC the day before and locks at 12:00 UTC on the day, so there is always one to bet into
  (tomorrow's opens before today's locks); resolution after 00:05 the next day, same dispute window and crank as the
  stock pools.
- **Transfer fees.** Tessera (0.2 %) and PreStocks (0.5 %) mints charge on every transfer. `place_bet` and `seed_market`
  book what the vault actually received (balance before/after the transfer), so the pools never exceed the vault and a
  payout simply lands net of the issuer's fee. Before a fee-mint vault is closed the crank harvests the withheld fees to
  the mint (`HarvestWithheldTokensToMint`, permissionless); Token-2022 refuses to close an account holding any.
