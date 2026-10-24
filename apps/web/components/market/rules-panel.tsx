import type { ConfigView, MarketView } from "@/lib/chain-core";
import { earlyBirdUntil } from "@/lib/chain-core";
import type { EventView } from "@/lib/events";
import { t } from "@/lib/i18n";
import { closeMoment, issuerOf, tokenSymbol } from "@/lib/stocks";
import { dayEnd, dayStart, fmtDay, fmtHm, fmtHmRange, fmtTs } from "@/lib/time";
import { esc } from "@/lib/text";
import { RichText } from "@/components/rich-text";

type RulesPanelProps = {
  event: EventView;
  market: MarketView;
  config: ConfigView;
};

const atBell = (ts: number) => new Date(ts * 1000).toLocaleTimeString("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" }) === "09:30";

export function issuerFeeOf(market: MarketView) {
  const issuer = issuerOf(market);
  return issuer === "Tessera" ? "0.2%" : issuer === "PreStocks" ? "0.5%" : null;
}

export function RulesPanel({ event, market, config }: RulesPanelProps) {
  const token = esc(tokenSymbol(market));
  const symbol = esc(event.symbol);
  if (event.kind === "day") {
    const top = Math.abs(market.thresholds[market.nBuckets - 2] ?? 0) / 10000;
    const pct = top ? top.toFixed(top % 1 ? 1 : 0) + "%" : "";
    const issuerFee = issuerFeeOf(market);
    const payouts = t("rules.payouts", { tok: token, early: (config.feeBps - config.earlyBirdDiscountBps) / 100, until: fmtTs(earlyBirdUntil(config, market)), fee: config.feeBps / 100 });
    return (
      <ul>
        <RichText as="li" html={t("rules.day.q", { sym: symbol, ts: esc(fmtTs(dayEnd(event.date))), n: market.nBuckets })} />
        <RichText as="li" html={t("rules.day.betting", { open: fmtTs(market.openTs), close: fmtTs(market.closeTs) })} />
        <RichText as="li" html={t("rules.day.result", { range: esc(fmtHmRange(dayEnd(event.date) - 3600, dayEnd(event.date))), day: esc(fmtDay(dayEnd(event.date))), base: esc(fmtTs(dayStart(event.date))), after: fmtTs(market.resolveAfterTs), h: config.disputeWindowSecs / 3600 })} />
        <RichText as="li" html={payouts} />
        {issuerFee && <RichText as="li" html={t("rules.issuerFee", { iss: esc(issuerOf(market)), fee: issuerFee, tok: token })} />}
        {event.category === "memes" && <RichText as="li" html={t("rules.day.why", { time: esc(fmtHm(market.openTs)) })} />}
        <RichText as="li" html={pct ? t("rules.day.ranges", { pct }) : t("rules.day.rangesNoPct")} />
      </ul>
    );
  }
  return (
    <ul>
      <RichText as="li" html={t("rules.close.q", { sym: symbol, ts: esc(fmtTs(closeMoment(market))) })} />
      <RichText as="li" html={t("rules.close.betting", { open: fmtTs(market.openTs), openBell: atBell(market.openTs) ? t("rules.close.openBell") : "", close: fmtTs(market.closeTs), closeBell: atBell(market.closeTs) ? t("rules.close.closeBell") : "" })} />
      <RichText as="li" html={t("rules.close.result", { after: fmtTs(market.resolveAfterTs), h: config.disputeWindowSecs / 3600 })} />
      <RichText as="li" html={t("rules.payouts", { tok: token, early: (config.feeBps - config.earlyBirdDiscountBps) / 100, until: fmtTs(earlyBirdUntil(config, market)), fee: config.feeBps / 100 })} />
      <RichText as="li" html={t("rules.close.divs")} />
      <RichText as="li" html={t("rules.close.issuer", { iss: esc(issuerOf(market)) || t("rules.theIssuer"), tok: token })} />
      <RichText as="li" html={t("rules.close.ranges", { sym: symbol })} />
    </ul>
  );
}
