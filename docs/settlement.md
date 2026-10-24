# Settlement and trust

## Why you can trust the settlement

1. **The server never holds funds.** Stakes sit in a program-owned vault per market; only the program's payout math can
   move them.
2. **The proposer submits a number, not a winner.** The resolver reads the official daily closes (Yahoo Finance chart
   API; `PRICE_SOURCE=alpaca` switches to Alpaca SIP daily bars — both agree to the cent), computes the close-to-close
   move and proposes it together with the **sha256 of the raw price response**. The winning range is derived
   **on-chain** from the market's thresholds.
   Before it proposes, the number has to pass three checks, and a failed check holds the market for the next run
   instead of posting a wrong result: the bar before the target must be the calendar's previous session (a dropped bar
   would silently shift "previous close" back a day); the target bar must be final (the source's last regular trade
   at or after the closing bell, so an intraday price is never mistaken for the close); and the close must **match
   Nasdaq's official close to the cent** — an independent second source with no key. Closes that differ but leave
   the day in the same range settle on the primary, with the difference written into the evidence; closes that put
   the day in different ranges are never proposed, and if 24 h of retries do not reconcile them the market refunds
   itself. If Nasdaq has nothing for the
   day yet the resolver waits up to two hours after the bell, then proceeds on the primary alone and says so in the
   published evidence. Fetches retry on network errors; whatever still fails is retried by cron every ten minutes.
3. **Anyone can check the number.** The raw response is published byte for byte; the market page re-hashes it **in
   your browser** and shows whether it matches the hash stored on-chain.
4. **Dispute window.** A proposal can be disputed (wallet-signed) for six hours on devnet; it can be corrected by
   re-proposing, which restarts the window. After the window anyone can finalize. A dispute, a held-back market, a
   disagreement between the price sources, a market that is overdue or a payout that keeps failing each page the
   operator (Telegram), so the window is never left to run out unwatched.
5. **Betting closes before any of the answer exists.** Bets stop at the opening bell of the session being predicted.
6. **Integer math end to end.** Moves are stored in ppm and floored, so a fall of any size can never round onto the
   0 % threshold; the page floors to whole basis points for the same reason.

### Trust model, stated plainly

- **The proposer key can propose any number.** The checks above run off-chain, in the same process that holds the key.
  A compromised resolver could propose a wrong move; the range still comes from the on-chain thresholds, but a wrong
  input gives a wrong range. What stops it is the six-hour window and a second machine: `apps/server/src/markets/verify.ts`
  runs every ten minutes on a different host that holds the admin key, fetches the closes itself (for on-chain closes:
  from its own per-minute samples), and **voids a proposal whose range it cannot reproduce** — a full refund, never a
  different winner. A proposal it still cannot check 45 minutes before the window closes (no price source
  answered) is voided too: nothing settles on a value nobody re-derived (`apps/server/src/markets/policy.ts`). For an on-chain close, a disagreement within 0.5 % of a threshold only pages the operator (two samplers never see the same quotes). Disputes are recorded off-chain and
  have no on-chain effect by themselves.
- **The admin is fully trusted.** The admin can finalize inside the window, void any open or proposed market
  (full refund), and change the proposer, treasury and fee (capped at 10 %; a bet already placed keeps its rate). The admin cannot move
  vault funds anywhere but to winners (per the payout math) or, after every position is settled, fees and dust to the
  treasury.
- **The issuer is trusted by construction.** Every xStock carries a permanent delegate and a pause switch; the vaults
  are ordinary token accounts to the issuer. Nothing on Solana can change that, so the site says it on every page.
- **On devnet** both keys are single hot keys: the proposer lives on the server, the admin does not. **Before mainnet**
  the admin, the upgrade authority and the treasury move to a 2-of-3 Squads multisig that the server is not a member
  of; the server keeps only the proposer key, which can never touch funds. Corrections then need a second signature
  and the window gives the time to gather it.
- **A market whose price never comes refunds itself.** Still unproposed 24 h after its resolve time (a session that
  never traded, a token whose quotes disappeared), a market may be voided by the proposer (`void_stale_market`; the
  program checks the delay) and the crank refunds every stake. That is the only power the proposer has beyond
  proposing a number: it can return money, never pick a winner.

We do not settle on Pyth: since 2026-08-26 Hermes requires an API key for both latest and historical prices, and its
equity feed reports the last trade before 16:00, not the official closing print these markets are defined on.
