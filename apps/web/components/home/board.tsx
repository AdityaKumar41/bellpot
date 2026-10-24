"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { EventView } from "@/lib/events";
import { payoutMultiple } from "@/lib/events";
import { dayLocale, t, tn } from "@/lib/i18n";
import { bucketLabel, bucketName, categoryName, fmtPx, fmtUsd, issuerOf, question, STOCK_META, STOCK_NAMES, STOCK_ORDER, stockQuote, tokenSymbol, type Category } from "@/lib/stocks";
import { timeLeft } from "@/lib/time";
import { RichText } from "@/components/rich-text";
import { TickerBadge } from "@/components/layout/ticker-badge";

const FEE_BPS = 300;
const LINE = ["#2f6fed", "#17a35a"];

type Filters = { cat: string; status: string; stock: string; issuer: string; sort: string };

export function HomeBoard({ events, catalog, ready, error, filters, onStatus }: {
  events: EventView[];
  catalog: EventView[];
  ready: boolean;
  error: string | null;
  filters: Filters;
  onStatus: (status: string) => void;
}) {
  const [spot, setSpot] = useState(0);
  const featured = events.length ? events[Math.min(spot, events.length - 1)] : null;
  const rest = featured ? events.filter((event) => event.key !== featured.key) : [];
  const symbols = catalog.length === 0 ? listedSymbols(filters.cat, filters.stock) : [];

  return (
    <div className="board">
      <div className="board-tools">
        <div className="seg">
          {[["open", t("filter.open")], ["live", t("filter.live")], ["resolved", t("filter.resolved")], ["all", t("filter.all")]].map(([key, label]) => (
            <button key={key} type="button" className={filters.status === key ? "on" : ""} onClick={() => onStatus(key)}>{label}</button>
          ))}
        </div>
      </div>
      {error && <div className="msg err">{t("home.loadErr", { err: error })}</div>}
      {!error && !ready && <div className="note pad">{t("home.loading")}</div>}
      {!error && ready && !featured && symbols.length === 0 && <RichText as="div" className="empty-state" html={t("home.empty")} />}
      {!error && ready && (featured || symbols.length > 0) && (
        <>
          <Featured event={featured} symbols={symbols} count={events.length} onStep={(delta) => setSpot((index) => {
            const size = events.length || 1;
            return (Math.min(index, size - 1) + delta + size) % size;
          })} />
          <div className="trust">
            {["hero.s1", "hero.s2", "hero.s3"].map((key) => (
              <div key={key} className="trust-card"><RichText html={t(key)} /></div>
            ))}
          </div>
          <Section title={t("status.upcoming")}>
            <div className="upcoming">
              {rest.length > 0
              ? rest.slice(0, 5).map((event) => <EventCard key={event.key} event={event} />)
              : symbols.slice(0, 5).map((symbol) => <StockCard key={symbol} symbol={symbol} />)}
            </div>
          </Section>
          {(["stocks", "preipo", "memes"] as Category[]).map((category) => {
            const rows = events.filter((event) => event.category === category);
            const names = rows.length ? [] : symbols.filter((symbol) => (STOCK_META[symbol]?.category ?? "stocks") === category);
            if (!rows.length && !names.length) return null;
            return (
              <Section key={category} title={categoryName(category)}>
                <div className="mktrows">
                  {rows.map((event) => <MarketRow key={event.key} event={event} />)}
                  {names.map((symbol) => <StockRow key={symbol} symbol={symbol} />)}
                </div>
              </Section>
            );
          })}
        </>
      )}
    </div>
  );
}

export function HomeRail({ events, ready }: { events: EventView[]; ready: boolean }) {
  const symbols = listedSymbols("all");
  const quotes = symbols
    .map((symbol) => ({ symbol, quote: stockQuote(symbol) }))
    .filter((row): row is { symbol: string; quote: NonNullable<ReturnType<typeof stockQuote>> } => !!row.quote);
  const mag = (quote: { usd: number; stock: number | null }) => Math.abs(spread(quote) ?? 0);
  const movers = [...quotes].sort((a, b) => mag(b.quote) - mag(a.quote)).slice(0, 5);
  const volume = (category: Category) => events.filter((event) => event.category === category).reduce((sum, event) => sum + (event.potUsd ?? 0), 0);

  return (
    <>
      <div className="promo">
        <div className="promo-kicker">BellPot</div>
        <RichText as="div" className="promo-title" html={t("hero.h1")} />
        <RichText as="p" html={t("hero.p")} />
      </div>
      {(["stocks", "preipo", "memes"] as Category[]).map((category) => {
        const pot = volume(category);
        const count = symbols.filter((symbol) => (STOCK_META[symbol]?.category ?? "stocks") === category).length;
        if (!count && !pot) return null;
        return (
          <Link key={category} className="hub" href={`/?cat=${category}`}>
            <span className="hub-mark" aria-hidden="true">{categoryName(category).slice(0, 1)}</span>
            <span>
              <b>{categoryName(category)}</b>
              <em>{pot ? t("home.pot", { usd: fmtUsd(pot) }) : tn("markets", count)}</em>
            </span>
            <span className="hub-go" aria-hidden="true">›</span>
          </Link>
        );
      })}
      <div className="railcard">
        <div className="railhead"><b>{t("dash.trading")}</b></div>
        {!ready && <div className="note">{t("home.loading")}</div>}
        {ready && quotes.slice(0, 6).map((row) => <QuoteRow key={row.symbol} symbol={row.symbol} usd={row.quote.usd} delta={spread(row.quote)} hint={row.quote.token} />)}
      </div>
      {movers.length > 0 && (
        <div className="railcard">
          <div className="railhead"><b>{t("dash.movers")}</b></div>
          {movers.map((row) => <QuoteRow key={row.symbol} symbol={row.symbol} usd={row.quote.usd} delta={spread(row.quote)} hint={STOCK_NAMES[row.symbol] ?? row.symbol} />)}
        </div>
      )}
    </>
  );
}

function Featured({ event, symbols, count, onStep }: { event: EventView | null; symbols: string[]; count: number; onStep: (delta: number) => void }) {
  if (!event) {
    const symbol = symbols[0];
    const quote = symbol ? stockQuote(symbol) : null;
    return (
      <section className="feature">
        <div className="feature-kicker">{symbol ? categoryName(STOCK_META[symbol]?.category ?? "stocks") : ""}</div>
        <h1>{symbol ? (STOCK_NAMES[symbol] ?? symbol) : ""}</h1>
        <p className="note">{t("home.noBetsNoSeed")}</p>
        {quote && <div className="feature-px">{fmtPx(quote.usd)} <span>{quote.token}</span></div>}
      </section>
    );
  }
  const market = event.markets[0];
  const legs = leading(event);
  const href = `/market?e=${encodeURIComponent(event.key)}`;
  return (
    <section className="feature">
      <div className="feature-top">
        <div>
          <div className="feature-kicker">{categoryName(event.category)}</div>
          <h1><Link href={href}>{question(market)}</Link></h1>
        </div>
        {count > 1 && (
          <div className="pager">
            <button type="button" onClick={() => onStep(-1)}>‹</button>
            <button type="button" onClick={() => onStep(1)}>›</button>
          </div>
        )}
      </div>
      <div className="feature-body">
        <div className="book">
          <div className="book-h"><span>{t("filter.stockAria")}</span><span>{t("dash.payout")}</span></div>
          {legs.map((leg, index) => (
            <Link key={leg.index} className="book-row" href={href}>
              <span className="book-name">
                <i style={{ background: LINE[index] }} />
                <b>{rangeLabel(event, leg.index)}</b>
                <em>{Math.round(leg.share * 100)}%</em>
              </span>
              <span className="book-bar"><i style={{ width: `${Math.max(4, leg.share * 100)}%`, background: LINE[index] }} /></span>
              <span className="book-pay">{pays(market, leg.index)}</span>
            </Link>
          ))}
          <div className="book-foot">
            {event.potUsd != null && <span>{t("home.pot", { usd: fmtUsd(event.potUsd) })}</span>}
            <span>{tn("bettors", event.bettors)}</span>
            <span>{event.markets.map((item) => tokenSymbol(item)).join(" · ")}</span>
          </div>
        </div>
        <div className="feature-chart">
          <BookChart legs={legs.map((leg, index) => ({ name: rangeLabel(event, leg.index), pct: leg.share, color: LINE[index] }))} date={event.date} />
          <div className="chart-note">{t("home.distTitle")}</div>
        </div>
      </div>
      <div className="feature-news">
        <b>{event.name}</b>
        <p>
          {[...new Set(event.markets.map((item) => issuerOf(item)).filter(Boolean))].join(", ")}
          {event.status === "open" ? ` · ${t("home.left", { t: timeLeft(event.closeTs) })}` : ""}
        </p>
      </div>
    </section>
  );
}

function BookChart({ legs, date }: { legs: { name: string; pct: number; color: string }[]; date: string }) {
  const w = 560;
  const h = 196;
  const left = 12;
  const right = 46;
  const top = 14;
  const bottom = 26;
  const y = (pct: number) => top + (1 - pct) * (h - top - bottom);
  const label = date ? new Date(date + "T12:00:00Z").toLocaleDateString(dayLocale(), { month: "short", day: "numeric", timeZone: "UTC" }) : "";
  return (
    <svg className="book-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={t("home.distTitle")}>
      {[0, 0.5, 1].map((grid) => (
        <g key={grid}>
          <line x1={left} x2={w - right} y1={y(grid)} y2={y(grid)} stroke="#eef0f2" />
          <text x={w - 8} y={y(grid) + 4} textAnchor="end" fill="#9aa1ab" fontSize="11">{Math.round(grid * 100)}%</text>
        </g>
      ))}
      {legs.map((leg) => (
        <g key={leg.name}>
          <line x1={left} x2={w - right} y1={y(leg.pct)} y2={y(leg.pct)} stroke={leg.color} strokeWidth="2.25" />
          <circle cx={w - right} cy={y(leg.pct)} r="4" fill={leg.color} />
        </g>
      ))}
      {label && <text x={w - right} y={h - 6} textAnchor="end" fill="#9aa1ab" fontSize="11">{label}</text>}
    </svg>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function EventCard({ event }: { event: EventView }) {
  const market = event.markets[0];
  return (
    <Link className="soon" href={`/market?e=${encodeURIComponent(event.key)}`}>
      <TickerBadge symbol={event.symbol} />
      <div className="soon-date">{dayLabel(event.date)}</div>
      <b>{question(market)}</b>
      <span>{event.name}</span>
    </Link>
  );
}

function StockCard({ symbol }: { symbol: string }) {
  const quote = stockQuote(symbol);
  return (
    <Link className="soon" href={`/?stock=${encodeURIComponent(symbol)}`}>
      <TickerBadge symbol={symbol} />
      <div className="soon-date">{categoryName(STOCK_META[symbol]?.category ?? "stocks")}</div>
      <b>{STOCK_NAMES[symbol] ?? symbol}</b>
      <span>{quote ? `${fmtPx(quote.usd)} · ${quote.token}` : (STOCK_NAMES[symbol] ?? symbol)}</span>
    </Link>
  );
}

function MarketRow({ event }: { event: EventView }) {
  const market = event.markets[0];
  const legs = leading(event);
  return (
    <Link className="mktrow" href={`/market?e=${encodeURIComponent(event.key)}`}>
      <TickerBadge symbol={event.symbol} small />
      <span className="mktrow-q">
        <b>{question(market)}</b>
        <em>{event.potUsd != null ? t("home.pot", { usd: fmtUsd(event.potUsd) }) : event.name}</em>
      </span>
      <span className="mktrow-odds">
        {legs.map((leg, index) => (
          <span key={leg.index}><i style={{ background: LINE[index] }} />{Math.round(leg.share * 100)}%</span>
        ))}
      </span>
    </Link>
  );
}

function StockRow({ symbol }: { symbol: string }) {
  const quote = stockQuote(symbol);
  return (
    <Link className="mktrow" href={`/?stock=${encodeURIComponent(symbol)}`}>
      <TickerBadge symbol={symbol} small />
      <span className="mktrow-q">
        <b>{STOCK_NAMES[symbol] ?? symbol}</b>
        <em>{categoryName(STOCK_META[symbol]?.category ?? "stocks")}</em>
      </span>
      <span className="mktrow-odds">{quote ? fmtPx(quote.usd) : "—"}</span>
    </Link>
  );
}

function QuoteRow({ symbol, usd, delta, hint }: { symbol: string; usd: number; delta: number | null; hint: string }) {
  const up = (delta ?? 0) >= 0;
  return (
    <Link className="qrow" href={`/?stock=${encodeURIComponent(symbol)}`}>
      <span>
        <b>{STOCK_NAMES[symbol] ?? symbol}</b>
        <em>{hint}</em>
      </span>
      <span className="qrow-n">
        <b>{fmtPx(usd)}</b>
        {delta != null && <em className={up ? "up" : "down"}>{up ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(2)}%</em>}
      </span>
    </Link>
  );
}

function leading(event: EventView) {
  return event.dist
    .map((share, index) => ({ index, share }))
    .sort((a, b) => b.share - a.share || a.index - b.index)
    .slice(0, 2);
}

function pays(market: EventView["markets"][number], index: number) {
  const multiple = payoutMultiple(market, index, FEE_BPS);
  return multiple == null ? "—" : multiple.toFixed(2) + "x";
}

function rangeLabel(event: EventView, index: number) {
  return bucketName(event.markets[0], index) || bucketLabel(event.markets[0], index);
}

function listedSymbols(category: string, stock = "all") {
  return STOCK_ORDER.filter((symbol) => (stock === "all" || symbol === stock) && (category === "all" || (STOCK_META[symbol]?.category ?? "stocks") === category));
}

function spread(quote: { usd: number; stock: number | null }) {
  if (!quote.stock) return null;
  return (quote.usd - quote.stock) / quote.stock;
}

function dayLabel(date: string) {
  if (!date) return "";
  return new Date(date + "T12:00:00Z").toLocaleDateString(dayLocale(), { month: "short", day: "numeric", timeZone: "UTC" });
}
