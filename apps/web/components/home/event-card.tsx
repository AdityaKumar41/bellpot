import Link from "next/link";
import type { EventView } from "@/lib/events";
import { statusLabel } from "@/lib/events";
import { t, tn } from "@/lib/i18n";
import { bucketColor } from "@/lib/buckets";
import { bucketLabel, bucketName, fmtMove, fmtUsd, issuerOf, question, tokenSymbol } from "@/lib/stocks";
import { fmtTs, timeLeft } from "@/lib/time";
import { esc } from "@/lib/text";
import { RichText } from "@/components/rich-text";
import { TickerBadge } from "@/components/layout/ticker-badge";

type EventCardProps = {
  event: EventView;
  issuer: string;
};

const rangeLabel = (event: EventView, index: number) => bucketName(event.markets[0], index) || bucketLabel(event.markets[0], index);

export function EventCard({ event, issuer }: EventCardProps) {
  const market = event.markets[0];
  const backed = event.dist.some((share) => share > 0);
  const mine = issuer !== "all" ? event.markets.find((item) => issuerOf(item) === issuer) : undefined;
  const href = `/market?e=${encodeURIComponent(event.key)}${mine ? `&t=${encodeURIComponent(tokenSymbol(mine))}` : ""}`;
  let lead: string;
  if (event.outcome != null) lead = `${t("home.result", { label: `<b>${esc(rangeLabel(event, event.outcome))}</b>` })}${event.moveValue != null ? ` · ${fmtMove(event.moveValue)}` : ""}`;
  else if (event.proposed != null) lead = `${t("home.proposed", { label: `<b>${esc(rangeLabel(event, event.proposed))}</b>` })}${event.moveValue != null ? ` · ${fmtMove(event.moveValue)}` : ""}`;
  else if (backed) {
    const index = event.dist.indexOf(Math.max(...event.dist));
    lead = t("home.mostBacked", { label: `<b>${esc(rangeLabel(event, index))}</b>`, pct: Math.round(event.dist[index] * 100) });
  } else lead = `<span class="note">${t(event.markets.some((item) => item.seed > 0) ? "home.noBets" : "home.noBetsNoSeed")}</span>`;
  const when = event.status === "open" ? t("home.left", { t: timeLeft(event.closeTs) }) : event.status === "trading" ? t("home.resultAt", { ts: fmtTs(event.resolveAfterTs) }) : "";

  return (
    <Link className="ev" href={href}>
      <div className="ev-head">
        <TickerBadge symbol={event.symbol} />
        <span className={`pill ${event.status}`}>{event.status === "open" ? t("status.openShort") : statusLabel(event.status)}</span>
      </div>
      <div className="ev-top">
        <div>
          <div className="ev-q">{question(market)}</div>
          <div className="ev-s">{event.name} · {event.markets.map((item) => tokenSymbol(item)).join(" · ")}</div>
        </div>
      </div>
      <div className="dist" title={t("home.distTitle")}>
        {backed
          ? event.dist.map((share, index) => <i key={index} style={{ width: `${(share * 100).toFixed(1)}%`, background: bucketColor(market, index) }} />)
          : <i className="empty" />}
      </div>
      <RichText className="ev-lead" html={lead} />
      <div className="ev-foot">
        {event.potUsd != null && <span>{t("home.pot", { usd: fmtUsd(event.potUsd) })}</span>}
        <span>{tn("bettors", event.bettors)}</span>
        <span className="ev-when">{when}</span>
      </div>
    </Link>
  );
}
