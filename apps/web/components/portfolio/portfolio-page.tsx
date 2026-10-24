"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { API_BASE, explorerTx, isTxId } from "@/lib/config";
import { NO_OUTCOME, STATUS, fetchConfig, fetchMarkets, fetchPositionsByOwner, payoutIfBucket, type MarketView } from "@/lib/chain";
import { t } from "@/lib/i18n";
import { bucketLabel, bucketName, fmtAmt, fmtMove, issuerOf, loadPrices, loadStocks, question, tokenSymbol, usdOf } from "@/lib/stocks";
import { fmtTs, timeLeft } from "@/lib/time";
import { RichText } from "@/components/rich-text";
import { SiteShell } from "@/components/layout/site-shell";
import { useWallet } from "@/components/wallet/wallet-provider";

const label = (market: MarketView, index: number) => bucketName(market, index) || bucketLabel(market, index);

export function PortfolioPage() {
  const { session, trackStocks } = useWallet();
  return (
    <SiteShell>
      <div className="pagehead"><h1>{t("nav.mybets")}</h1></div>
      <PortfolioBody owner={session?.address ?? null} onMarkets={trackStocks} />
    </SiteShell>
  );
}

function PortfolioBody({ owner, onMarkets }: { owner: string | null; onMarkets: (markets: MarketView[]) => void }) {
  const [openHtml, setOpen] = useState<ReactNode>(<div className="note">{t("pf.connect")}</div>);
  const [settled, setSettled] = useState<ReactNode>(<div className="note">—</div>);

  useEffect(() => {
    let cancelled = false;
    if (!owner) {
      setOpen(<div className="note">{t("pf.connect")}</div>);
      setSettled(<div className="note">—</div>);
      return;
    }
    setOpen(<div className="note">{t("common.loading")}</div>);
    setSettled(<div className="note">{t("common.loading")}</div>);
    (async () => {
      try {
        const [markets] = await Promise.all([fetchMarkets(), loadPrices(), loadStocks()]);
        if (cancelled) return;
        onMarkets(markets);
        const byId = new Map(markets.map((market) => [market.id, market]));
        void (async () => {
          try {
            const response = await fetch(`${API_BASE}/positions/${owner}`);
            const body = await response.json();
            if (cancelled) return;
            if (!body.settled?.length) setSettled(<div className="note">{t("pf.noneSettled")}</div>);
            else setSettled(<SettledTable rows={body.settled} byId={byId} />);
          } catch {
            if (!cancelled) setSettled(<div className="note">{t("pf.histErr")}</div>);
          }
        })();
        // No markets on the API means there is no position to look up. Skipping that read keeps the page off a
        // program-wide account scan when this cluster has not been initialized.
        if (!markets.length) {
          setOpen(<RichText as="div" className="note" html={t("pf.none")} />);
          return;
        }
        const [positions, config] = await Promise.all([fetchPositionsByOwner(owner), fetchConfig()]);
        if (cancelled) return;
        const byAddr = new Map(markets.map((market) => [market.address, market]));
        const rows = positions.map((position) => ({ position, market: byAddr.get(position.marketAddress) ?? byId.get(position.marketId) })).filter((row): row is { position: (typeof positions)[number]; market: MarketView } => !!row.market);
        setOpen(rows.length ? <OpenTable rows={rows} windowSecs={config.disputeWindowSecs} /> : <RichText as="div" className="note" html={t("pf.none")} />);
      } catch (err) {
        if (!cancelled) setOpen(<div className="note">{err instanceof Error ? err.message : String(err)}</div>);
      }
    })();
    return () => { cancelled = true; };
  }, [owner, onMarkets]);

  return (
    <>
      <div id="open">{openHtml}</div>
      <h2>{t("pf.settled")}</h2>
      <div id="settled">{settled}</div>
    </>
  );
}

function StatusPill({ market }: { market: MarketView }) {
  const now = Date.now() / 1000;
  const labelText = market.status === 0
    ? (now < market.openTs ? t("status.upcoming") : now < market.closeTs ? t("status.open") : t("status.trading"))
    : market.status === 1 ? t("status.proposed") : t("status.chain." + STATUS[market.status]);
  const cls = market.status === 0 ? (now < market.closeTs ? "open" : "trading") : market.status === 1 ? "proposed" : STATUS[market.status].toLowerCase();
  return <span className={`pill ${cls}`}>{labelText}</span>;
}

function OpenTable({ rows, windowSecs }: { rows: { position: { amounts: number[]; feeBps: number[] }; market: MarketView }[]; windowSecs: number }) {
  return (
    <>
      <div className="scroll">
        <table className="tbl">
          <thead><tr><th>{t("pf.colMarket")}</th><th>{t("pf.colStakes")}</th><th>{t("pf.colStatus")}</th><th className="r">{t("pf.colWorth")}</th></tr></thead>
          <tbody>
            {rows.map(({ position, market }) => {
              const token = tokenSymbol(market);
              const now = Date.now() / 1000;
              const fin = (market.proposedAt || market.resolveAfterTs) + windowSecs;
              const when = market.status === 1
                ? t("pf.whenProposed", { ts: fmtTs(fin), left: timeLeft(fin) })
                : market.status >= 2 ? ""
                  : t(now < market.closeTs ? "pf.whenOpen" : "pf.whenClosed", { close: fmtTs(market.closeTs), left: timeLeft(market.closeTs), result: fmtTs(market.resolveAfterTs), final: fmtTs(fin) });
              const winner = market.status === 2 ? market.outcome : market.status === 1 ? market.proposedOutcome : NO_OUTCOME;
              let value: string;
              if (market.status === 3) value = t("pf.refund", { amt: `${fmtAmt(market, position.amounts.reduce((a, b) => a + b, 0))} ${token}` });
              else if (winner !== NO_OUTCOME) {
                const result = payoutIfBucket(market, position.amounts, position.feeBps, winner);
                value = result.kind === "lost" ? t("pf.lost") : `${fmtAmt(market, result.payout)} ${token} ${usdOf(market, result.payout)} (${result.kind === "refund" ? t("pf.refundNobody", { label: label(market, winner) }) : t("pf.kind." + result.kind)})`;
              } else value = position.amounts.map((amount, index) => amount ? t("pf.ifLabel", { amt: `${fmtAmt(market, payoutIfBucket(market, position.amounts, position.feeBps, index).payout)} ${token}`, label: label(market, index) }) : "").filter(Boolean).join("\n");
              const note = market.status === 2 ? t("pf.stResolved") : market.status === 1 ? t("pf.stProposed", { label: label(market, market.proposedOutcome), move: fmtMove(market.proposedValue) }) : market.status === 3 ? t("pf.stVoided") : now < market.closeTs ? "" : t("pf.stTrading");
              return (
                <tr key={market.address}>
                  <td>
                    <Link href={`/market?id=${market.id}`}>{question(market)}</Link>
                    <div className="note">{token} · {t("trade.pool", { iss: issuerOf(market) })} · #{market.id}</div>
                    {when && <div className="note">{when}</div>}
                  </td>
                  <td>{position.amounts.map((amount, index) => amount ? <div key={index}>{label(market, index)}: <span className="mono">{fmtAmt(market, amount)}</span></div> : null)}</td>
                  <td><StatusPill market={market} />{note && <div className="note">{note}</div>}</td>
                  <td className="r mono">{value.split("\n").map((line) => <div key={line}>{line}</div>)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="note" style={{ marginTop: 8 }}>{t("pf.footnote")}</div>
    </>
  );
}

type SettledRow = { id: number; amounts: string[]; status: number; outcome: number; observed: number; metric: string; kind: string; payout: string; tx?: string; signature?: string; at: string };

function SettledTable({ rows, byId }: { rows: SettledRow[]; byId: Map<number, MarketView> }) {
  return (
    <div className="scroll">
      <table className="tbl">
        <thead><tr><th>{t("pf.colMarket")}</th><th>{t("pf.colStakes")}</th><th>{t("pf.colOutcome")}</th><th className="r">{t("pf.colPaid")}</th><th>Tx</th></tr></thead>
        <tbody>
          {rows.map((row) => {
            const market = byId.get(Number(row.id));
            const token = market ? tokenSymbol(market) : "";
            const amt = (value: number) => (market ? fmtAmt(market, value) : String(value));
            const outcome = row.status === 3 ? t("status.chain.Voided") : market ? `${label(market, Number(row.outcome))} (${fmtMove(Number(row.observed))})` : t("pf.range", { i: row.outcome });
            const cls = row.kind === "won" ? "ok" : row.kind === "lost" ? "err" : "";
            const txid = isTxId(row.tx ?? row.signature) ? String(row.tx ?? row.signature) : null;
            return (
              <tr key={`${row.id}-${row.at}`}>
                <td>
                  {market ? <Link href={`/market?id=${market.id}`}>{question(market)}</Link> : String(row.metric)}
                  <div className="note">{token} · #{row.id} · {fmtTs(Date.parse(row.at) / 1000)}</div>
                </td>
                <td>{row.amounts.map((amount, index) => Number(amount) ? <div key={index}>{market ? label(market, index) : t("pf.range", { i: index })}: <span className="mono">{amt(Number(amount))}</span></div> : null)}</td>
                <td>{outcome}</td>
                <td className="r mono"><span className={`msg ${cls}`} style={{ padding: "2px 8px" }}>{row.kind === "lost" ? "0" : amt(Number(row.payout))} {token}</span></td>
                <td className="hash">{txid ? <a href={explorerTx(txid)} target="_blank" rel="noopener">{txid.slice(0, 8)}…</a> : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
