"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NO_OUTCOME, currentFeeBps, fetchConfig, fetchMarkets, totalPool, type ConfigView, type MarketView } from "@/lib/chain";
import { buildEvents, eventKey, payoutMultiple, statusLabel, statusOf } from "@/lib/events";
import { t, tn } from "@/lib/i18n";
import { bucketColor } from "@/lib/buckets";
import { bucketLabel, bucketName, categoryName, closeMoment, fmtAmt, fmtMove, fmtPx, fmtUsd, issuerOf, loadPrices, loadStocks, prevCloseOf, priceOf, question, tokenSymbol, usdOf } from "@/lib/stocks";
import { dayStart, fmtDay, fmtTs, timeLeft } from "@/lib/time";
import { esc } from "@/lib/text";
import { RichText } from "@/components/rich-text";
import { SiteShell } from "@/components/layout/site-shell";
import { TickerBadge } from "@/components/layout/ticker-badge";
import { useWallet } from "@/components/wallet/wallet-provider";
import { ResolutionPanel } from "./resolution-panel";
import { RulesPanel } from "./rules-panel";
import { Timeline } from "./timeline";
import { TradePanel } from "./trade-panel";

const STALE_VOID_SECS = 86_400;
type Tab = "rules" | "resolution" | "details";

export function MarketPage() {
  const params = useSearchParams();
  const { trackStocks } = useWallet();
  const [markets, setMarkets] = useState<MarketView[]>([]);
  const [config, setConfig] = useState<ConfigView | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [bucket, setBucket] = useState(-1);
  const [tab, setTab] = useState<Tab>("rules");
  const [amount, setAmount] = useState("");
  const [amountFor, setAmountFor] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const tabInit = useRef(false);
  const query = `${params.get("e") ?? ""}|${params.get("t") ?? ""}|${params.get("id") ?? ""}`;

  async function load(fresh = false) {
    const [nextMarkets, nextConfig] = await Promise.all([fetchMarkets({ fresh }), fetchConfig({ fresh }), loadPrices(), loadStocks()]);
    setMarkets(nextMarkets);
    setConfig(nextConfig);
    trackStocks(nextMarkets);
    setError(null);
    setReady(true);
    return nextMarkets;
  }

  useEffect(() => {
    let cancelled = false;
    const run = () => load().catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)); });
    void run();
    const timer = setInterval(() => {
      if (document.activeElement?.matches("input, textarea")) return;
      void run();
    }, 30_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [query, trackStocks]);

  const events = useMemo(() => buildEvents(markets), [markets]);
  const byId = params.get("id") ? markets.find((market) => market.id === Number(params.get("id"))) : undefined;
  const key = params.get("e") ?? (byId ? eventKey(byId) : "");
  const event = events.find((item) => item.key === key);
  const openEvent = event ? events.find((item) => item.symbol === event.symbol && item.status === "open" && item.key !== event.key) : undefined;
  const want = params.get("t") ?? (byId ? tokenSymbol(byId) : null);
  const market = event
    ? event.markets.find((item) => item.id === selectedId) || event.markets.find((item) => tokenSymbol(item) === want) || event.markets.find((item) => statusOf(item) === "open") || event.markets[0]
    : undefined;

  useEffect(() => {
    if (!market || tabInit.current) return;
    tabInit.current = true;
    if (market.status === 1 || market.status >= 2) setTab("resolution");
  }, [market]);

  useEffect(() => {
    if (market) document.title = `${question(market)} · BellPot`;
  }, [market]);

  if (error) {
    return <SiteShell><RichText className="msg err" html={t("mkt.loadErr", { err: esc(error) })} /></SiteShell>;
  }
  if (!ready || !config) {
    return <SiteShell><div className="note" style={{ padding: "30px 0" }}>{t("common.loading")}</div></SiteShell>;
  }
  if (!event || !market) {
    return <SiteShell><RichText as="div" className="empty-state" html={t("mkt.missing")} /></SiteShell>;
  }

  const status = statusOf(market);
  const token = tokenSymbol(market);
  const fee = currentFeeBps(config, market);
  const total = totalPool(market);
  const delayedUntil = market.status === 0 && Date.now() / 1000 >= market.resolveAfterTs + (event.kind === "day" ? 3600 : 3 * 3600) ? market.resolveAfterTs + STALE_VOID_SECS : 0;
  const name = (index: number) => bucketName(market, index) || bucketLabel(market, index);
  const full = (index: number) => (bucketName(market, index) ? `${bucketName(market, index)} (${bucketLabel(market, index)})` : bucketLabel(market, index));
  const previous = prevCloseOf(market);
  const previousDate = new Date(Date.parse(event.date + "T00:00:00Z") - 864e5).toISOString().slice(0, 10);
  const live = priceOf(market);
  const result = market.status === 2 || market.status === 4
    ? (market.outcome === NO_OUTCOME
      ? t("mkt.voided")
      : `${t("mkt.result", { label: `<b>${esc(full(market.outcome))}</b>`, move: fmtMove(market.proposedValue) })} · ${market.pools[market.outcome] === 0 ? t("mkt.resultRefund") : t("mkt.resultPaid")}`)
    : market.status === 3
      ? t("mkt.voided")
      : market.status === 1
        ? `${t("mkt.proposedResult", { label: `<b>${esc(full(market.proposedOutcome))}</b>`, move: fmtMove(market.proposedValue), ts: fmtTs(market.proposedAt + config.disputeWindowSecs), left: timeLeft(market.proposedAt + config.disputeWindowSecs) })}${market.pools[market.proposedOutcome] === 0 ? " " + t("mkt.proposedRefund") : ""}`
        : delayedUntil ? t("mkt.delayed", { when: fmtTs(delayedUntil) }) : "";
  const typed = amountFor === market.id ? amount : "";

  return (
    <SiteShell category={event.category}>
      <div className="evpage">
        <div className="evtop">
          <nav className="crumb">
            <Link href="/">{t("mkt.crumb")}</Link><span>›</span>
            <Link href={`/?cat=${encodeURIComponent(event.category)}`}>{categoryName(event.category)}</Link><span>›</span>
            <Link href={`/?cat=${encodeURIComponent(event.category)}&stock=${encodeURIComponent(event.symbol)}`}>{event.name}</Link><span>›</span>
            <span>{fmtDay(closeMoment(market))}</span>
          </nav>
          <header className="evhdr">
            <div>
              <div className="evhdr-top">
                <TickerBadge symbol={event.symbol} big />
                <span className={`pill ${status}`}>{delayedUntil ? t("status.delayed") : statusLabel(status)}</span>
              </div>
              <h1>{question(market)}</h1>
              <div className="evmeta">
                {status === "open" && <span>{t("mkt.closeIn", { t: timeLeft(market.closeTs) })}</span>}
                {event.potUsd != null && <span>{tn("mkt.potAcross", event.markets.length, { usd: fmtUsd(event.potUsd) })}</span>}
                <span>{tn("bettors", event.bettors)}</span>
                {event.kind === "day" && live != null && <span title={t("mkt.nowTitle")}>{t("mkt.now", { px: fmtPx(live) })}</span>}
                {event.kind === "day" && previous && previous.date === previousDate && <span title={t("mkt.prevTitle", { ts: fmtTs(dayStart(event.date)) })}>{t("mkt.prev", { px: fmtPx(previous.close) })}</span>}
                {event.kind === "day" && !(previous && previous.date === previousDate) && <span className="note">{t("mkt.prevLater", { ts: fmtTs(dayStart(event.date)) })}</span>}
              </div>
            </div>
          </header>
          <Timeline event={event} market={market} config={config} />
          <div className="toks" role="tablist" aria-label={t("mkt.poolAria")}>
            {event.markets.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={item.id === market.id} className={`tok${item.id === market.id ? " on" : ""}`} onClick={() => select(item.id)}>
                <b>{tokenSymbol(item)}</b>
                <span>{issuerOf(item)}</span>
                <em>{t("mkt.inPot", { amt: fmtAmt(item, totalPool(item) + item.seed, 3) })} {usdOf(item, totalPool(item) + item.seed)}</em>
              </button>
            ))}
          </div>
          {event.markets.length > 1 && <p className="note">{t("mkt.multiPools", { n: event.markets.length })}</p>}
          <div className="otable">
            <div className="orow ohead"><span>{t("mkt.colRange")}</span><span>{t("mkt.colChance")}</span><span>{t("mkt.colPays")}</span><span className="opool">{t("mkt.colPool")}</span><span /></div>
            {market.pools.map((pool, index) => {
              const pct = total ? `${Math.round((pool / total) * 100)}%` : "—";
              const multiple = payoutMultiple(market, index, fee);
              const won = (market.status === 2 || market.status === 4) && market.outcome === index;
              const proposed = market.status === 1 && market.proposedOutcome === index;
              return (
                <div key={index} className={`orow${bucket === index && status === "open" ? " sel" : ""}${won ? " win" : ""}`} style={{ ["--c" as string]: bucketColor(market, index) }}>
                  <span className="oname"><i /><b>{name(index)}</b>{bucketName(market, index) ? <small>{bucketLabel(market, index)}</small> : null}</span>
                  <span className="ochance">{pct}</span>
                  <span className="opays">{multiple ? multiple.toFixed(2) + "×" : status === "open" ? t("mkt.wholePot") : "—"}</span>
                  <span className="opool">{fmtAmt(market, pool, 3)} {token}</span>
                  <span>
                    {status === "open" && <button className="pickbtn" type="button" onClick={() => { setBucket(index); document.getElementById("amt")?.focus(); }}>{bucket === index ? t("mkt.selected") : t("mkt.pick")}</button>}
                    {won && <span className="pill open">{t("mkt.won")}</span>}
                    {proposed && <span className="pill proposed">{t("mkt.proposedPill")}</span>}
                  </span>
                </div>
              );
            })}
          </div>
          {market.seed > 0 && <p className="note">{t("mkt.seedNote", { amt: `${fmtAmt(market, market.seed, 3)} ${token} ${usdOf(market, market.seed)}`, tok: token })}</p>}
          {result && <RichText className="result" html={result} />}
        </div>
        <TradePanel
          event={event}
          openEvent={openEvent}
          market={market}
          config={config}
          bucket={bucket}
          onBucket={setBucket}
          amount={typed}
          onAmount={(value) => { setAmountFor(market.id); setAmount(value); }}
          delayedUntil={delayedUntil}
          rangeName={name}
          fullLabel={full}
          onStaked={(index, raw) => {
            setMarkets((current) => current.map((item) => item.id === market.id ? { ...item, pools: item.pools.map((pool, i) => i === index ? pool + raw : pool) } : item));
          }}
          onReload={() => load(true).then(() => undefined)}
        />
        <div className="evbottom">
          <div className="tabs" role="tablist">
            {(["rules", "resolution", "details"] as const).map((key) => (
              <button key={key} type="button" role="tab" className={`tab${tab === key ? " on" : ""}`} onClick={() => setTab(key)}>
                {{ rules: t("mkt.tabRules"), resolution: t("mkt.tabResolution"), details: t("mkt.tabDetails") }[key]}
              </button>
            ))}
          </div>
          <div className="tabpanel" id="tabpanel">
            {tab === "rules" && <RulesPanel event={event} market={market} config={config} />}
            {tab === "resolution" && <ResolutionPanel market={market} config={config} fullLabel={full} delayedUntil={delayedUntil} />}
            {tab === "details" && (
              <div className="kv">
                <b>{t("det.token")}</b>
                <span className="hash">{token} · {issuerOf(market)} · {market.mint}{market.multiplier !== 1 ? ` · ${t("det.multiplier", { x: market.multiplier })}` : ""}</span>
                <b>{t("det.account")}</b>
                <span className="hash">{market.address} (#{market.id})</span>
                <b>{t("det.openClose")}</b>
                <span>{fmtTs(market.openTs)} → {fmtTs(market.closeTs)}</span>
                <b>{t("det.resolvesAfter")}</b>
                <span>{fmtTs(market.resolveAfterTs)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );

  function select(id: number) {
    setSelectedId(id);
    const chosen = event?.markets.find((item) => item.id === id);
    if (!event || !chosen) return;
    const next = new URLSearchParams({ e: event.key, t: tokenSymbol(chosen) });
    history.replaceState(null, "", "?" + next);
  }
}
