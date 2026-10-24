import type { ConfigView, MarketView } from "@/lib/chain-core";
import { NO_OUTCOME } from "@/lib/chain-core";
import type { EventView } from "@/lib/events";
import { t } from "@/lib/i18n";
import { closeMoment } from "@/lib/stocks";
import { dayEnd, fmtDay, fmtHmRange, fmtTsShort, timeLeft } from "@/lib/time";

type TimelineProps = {
  event: EventView;
  market: MarketView;
  config: ConfigView;
};

export function Timeline({ event, market, config }: TimelineProps) {
  const now = Date.now() / 1000;
  const voided = market.status === 3 || ((market.status === 2 || market.status === 4) && market.outcome === NO_OUTCOME);
  const proposedTs = market.proposedAt || market.resolveAfterTs;
  const finalTs = proposedTs + config.disputeWindowSecs;
  const settled = market.status >= 2;
  const steps: { label: string; when: string; ts: number; done: boolean }[] = [
    { label: t("tl.opens"), when: fmtTsShort(market.openTs), ts: market.openTs, done: now >= market.openTs },
    { label: t("tl.closes"), when: fmtTsShort(market.closeTs), ts: market.closeTs, done: now >= market.closeTs },
    event.kind === "day"
      ? { label: t("tl.priceForms"), when: `${fmtHmRange(dayEnd(event.date) - 3600, dayEnd(event.date))}, ${fmtDay(dayEnd(event.date))}`, ts: dayEnd(event.date), done: now >= dayEnd(event.date) }
      : { label: t("tl.nyClose"), when: fmtTsShort(closeMoment(market)), ts: closeMoment(market), done: now >= closeMoment(market) },
    { label: market.proposedAt ? t("status.proposed") : t("tl.proposedFrom"), when: fmtTsShort(proposedTs), ts: proposedTs, done: !!market.proposedAt || settled },
    { label: voided ? t("tl.voided") : settled || market.proposedAt ? t("tl.final") : t("tl.finalEst"), when: settled && !market.proposedAt ? "" : fmtTsShort(finalTs), ts: finalTs, done: settled },
  ];
  const next = steps.findIndex((step) => !step.done);
  return (
    <ol className="tline">
      {steps.map((step, index) => (
        <li key={step.label} className={step.done ? "done" : index === next ? "next" : ""}>
          <b>{step.label}</b>
          <span>{step.when}</span>
          {index === next && step.ts > now && <em>{t("common.in", { t: timeLeft(step.ts) })}</em>}
        </li>
      ))}
    </ol>
  );
}
