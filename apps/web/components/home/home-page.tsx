"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchMarkets } from "@/lib/chain";
import { buildEvents, type EventView } from "@/lib/events";
import { t, tn } from "@/lib/i18n";
import { fmtUsd, issuerOf, loadPrices, loadStocks, STOCK_META, STOCK_NAMES, STOCK_ORDER, tokenSymbol } from "@/lib/stocks";
import { SiteShell } from "@/components/layout/site-shell";
import { useWallet } from "@/components/wallet/wallet-provider";
import { HomeBoard, HomeRail } from "./board";

const DEFAULTS = { cat: "all", stock: "all", issuer: "all", status: "open", sort: "closing", q: "" };
const CATEGORY_RANK: Record<string, number> = { stocks: 0, preipo: 1, memes: 2 };

type Filters = typeof DEFAULTS;

export function HomePage() {
  const params = useSearchParams();
  const router = useRouter();
  const { trackStocks } = useWallet();
  const [events, setEvents] = useState<EventView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const filters: Filters = {
    cat: params.get("cat") ?? DEFAULTS.cat,
    stock: params.get("stock") ?? DEFAULTS.stock,
    issuer: params.get("issuer") ?? DEFAULTS.issuer,
    status: params.get("status") ?? DEFAULTS.status,
    sort: params.get("sort") ?? DEFAULTS.sort,
    q: params.get("q") ?? DEFAULTS.q,
  };

  function setFilters(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value && value !== DEFAULTS[key as keyof Filters]) query.set(key, value);
    }
    router.replace(query.toString() ? `/?${query}` : "/", { scroll: false });
  }

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [markets] = await Promise.all([fetchMarkets(), loadPrices(), loadStocks()]);
        if (cancelled) return;
        setEvents(buildEvents(markets));
        trackStocks(markets);
        setError(null);
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    };
    void load();
    const timer = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [trackStocks]);

  const list = useMemo(() => {
    const q = filters.q.toLowerCase();
    const matched = events.filter((event) =>
      (filters.cat === "all" || event.category === filters.cat) &&
      (filters.stock === "all" || event.symbol === filters.stock) &&
      (filters.issuer === "all" || event.markets.some((market) => issuerOf(market) === filters.issuer)) &&
      (filters.status === "all" || (filters.status === "open" && event.status === "open") || (filters.status === "live" && (event.status === "trading" || event.status === "proposed")) || (filters.status === "resolved" && event.status === "resolved")) &&
      (!q || `${event.symbol} ${event.name} ${event.markets.map((market) => tokenSymbol(market) + " " + issuerOf(market)).join(" ")}`.toLowerCase().includes(q)));
    const by = {
      closing: (a: EventView, b: EventView) => (filters.status === "resolved" ? b.closeTs - a.closeTs : a.closeTs - b.closeTs),
      pot: (a: EventView, b: EventView) => (b.potUsd ?? 0) - (a.potUsd ?? 0),
      bettors: (a: EventView, b: EventView) => b.bettors - a.bettors,
    }[filters.sort as "closing" | "pot" | "bettors"] ?? (() => 0);
    const rank = (event: EventView) => CATEGORY_RANK[event.category] ?? 9;
    return matched.sort((a, b) => (filters.cat === "all" ? rank(a) - rank(b) : 0) || by(a, b) || a.symbol.localeCompare(b.symbol));
  }, [events, filters]);

  const pools = list.reduce((sum, event) => sum + event.markets.length, 0);
  const pot = list.reduce((sum, event) => sum + (event.potUsd ?? 0), 0);
  const issuers = [...new Set(events.flatMap((event) => event.markets.map((market) => issuerOf(market))).filter(Boolean))].sort();
  const inCat = STOCK_ORDER.filter((symbol) => filters.cat === "all" || (STOCK_META[symbol]?.category ?? "stocks") === filters.cat);
  const stockLabel = (symbol: string) => (STOCK_NAMES[symbol] && STOCK_NAMES[symbol] !== symbol ? `${symbol} · ${STOCK_NAMES[symbol]}` : symbol);
  return (
    <SiteShell
      category={filters.cat}
      query={filters.q}
      onSearch={(q) => setFilters({ q })}
      onCategory={(cat) => setFilters({ cat, stock: "all" })}
      rail={<HomeRail events={events} ready={ready} />}
      footer
    >
      <div className="filters">
        <select id="fstock" aria-label={t("filter.stockAria")} value={filters.stock} onChange={(event) => setFilters({ stock: event.target.value })}>
          <option value="all">{filters.cat === "all" ? t("filter.allStocksTokens") : filters.cat === "memes" ? t("filter.allMemes") : filters.cat === "preipo" ? t("filter.allPreipo") : t("filter.allStocks")}</option>
          {inCat.map((symbol) => <option key={symbol} value={symbol}>{stockLabel(symbol)}</option>)}
        </select>
        <select id="fissuer" aria-label={t("filter.issuerAria")} value={filters.issuer} onChange={(event) => setFilters({ issuer: event.target.value })}>
          <option value="all">{t("filter.allIssuers")}</option>
          {issuers.map((issuer) => <option key={issuer} value={issuer}>{issuer}</option>)}
        </select>
        <span className="sp" />
        <select id="fsort" aria-label={t("filter.sortAria")} value={filters.sort} onChange={(event) => setFilters({ sort: event.target.value })}>
          <option value="closing">{t("sort.closing")}</option>
          <option value="pot">{t("sort.pot")}</option>
          <option value="bettors">{t("sort.bettors")}</option>
        </select>
        <span className="note" id="summary">{list.length ? `${tn("markets", list.length)} · ${tn("pools", pools)}${pot ? ` · ${t("home.inPlay", { usd: fmtUsd(pot) })}` : ""}` : ""}</span>
      </div>
      <HomeBoard events={list} catalog={events} ready={ready} error={error} filters={filters} onStatus={(status) => setFilters({ status })} />
    </SiteShell>
  );
}
