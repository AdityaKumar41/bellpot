import type { MarketView } from "./chain-core";

const COLORS_4 = ["#e5484d", "#f5a524", "#6cc68e", "#12a150"];
const COLORS = ["#e5484d", "#f08c3a", "#f5a524", "#c3c65a", "#6cc68e", "#12a150", "#3b9ede", "#5b4bdb"];

/** Big drop → big gain runs red → green. */
export const bucketColor = (market: MarketView, index: number) =>
  market.nBuckets === 2
    ? index === 1
      ? "var(--gain)"
      : "var(--drop)"
    : market.nBuckets === 4
      ? COLORS_4[index]
      : COLORS[Math.round((index * (COLORS.length - 1)) / Math.max(1, market.nBuckets - 1))];
