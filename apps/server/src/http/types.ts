/** Wire shapes the site reads from `/api`. The browser maps `pubkey` onto its own `address` field. */

export type MarketJson = {
  pubkey: string;
  id: number;
  mint: string;
  tokenProgram: string;
  decimals: number;
  multiplier: number;
  metric: string;
  nBuckets: number;
  thresholds: number[];
  openTs: number;
  closeTs: number;
  resolveAfterTs: number;
  baseline: number;
  pools: number[];
  seed: number;
  status: number;
  outcome: number;
  proposedOutcome: number;
  proposedValue: number;
  proposedAt: number;
  positions: number;
  positionsOpen: number;
  feeCollected: number;
  snapshotHash: string;
};

export type ConfigJson = {
  admin: string;
  proposer: string;
  treasuryOwner: string;
  feeBps: number;
  earlyBirdDiscountBps: number;
  earlyBirdSecs: number;
  disputeWindowSecs: number;
  minBet: number;
  marketCount: number;
  paused: boolean;
};

export type ChainSnapshot = {
  at: number;
  markets: MarketJson[] | null;
  config: ConfigJson | null;
  pending: Promise<ChainSnapshot> | null;
};

export type ListedToken = {
  token: string;
  issuer: string;
  decimals: number;
  mint: string | null;
  mainnetMint: string;
  faucetUi?: number;
  symbol?: string;
  active?: boolean;
  seed?: number;
  tokenProgram?: string | null;
};

export type ListedStock = {
  symbol: string;
  name: string;
  category: string;
  kind: string;
  thresholdsBps: number[];
  icon: string | null;
  active: boolean;
  tokens: ListedToken[];
  selectedFor?: string[];
  liquidity?: number | null;
  volume24h?: number | null;
  holders?: number | null;
};

export type MintInfo = {
  tokenProgram: string;
  decimals: number;
  multiplier: number;
  at: number;
};
