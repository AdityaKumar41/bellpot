"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IS_TEST, explorerTx } from "@/lib/config";
import { currentFeeBps, earlyBirdUntil, fetchPositionAmounts, impliedPayout, type ConfigView, type MarketView } from "@/lib/chain";
import type { EventView } from "@/lib/events";
import { statusLabel, statusOf } from "@/lib/events";
import { payoutMultiple } from "@/lib/events";
import { t } from "@/lib/i18n";
import { bucketColor } from "@/lib/buckets";
import { bucketLabel, fmtAmt, fmtUnit, isUnitMultiple, issuerOf, minUnitExp, priceOf, snapUnit, toRaw, tokenSymbol, uiAmount, usdOf } from "@/lib/stocks";
import { fmtTs, timeLeft } from "@/lib/time";
import { esc } from "@/lib/text";
import { bindReferralAfterBet } from "@/lib/referral";
import { useWallet } from "@/components/wallet/wallet-provider";
import { RichText } from "@/components/rich-text";
import { issuerFeeOf } from "./rules-panel";

const MIN_BET_USD = 1;

type TradePanelProps = {
  event: EventView;
  openEvent?: EventView;
  market: MarketView;
  config: ConfigView;
  bucket: number;
  onBucket: (bucket: number) => void;
  amount: string;
  onAmount: (value: string) => void;
  delayedUntil: number;
  rangeName: (index: number) => string;
  fullLabel: (index: number) => string;
  onStaked: (bucket: number, amountRaw: number) => void;
  onReload: () => Promise<void>;
};

export function TradePanel({ event, openEvent, market, config, bucket, onBucket, amount, onAmount, delayedUntil, rangeName, fullLabel, onStaked, onReload }: TradePanelProps) {
  const wallet = useWallet();
  const { session, balances, shareBalance, balanceReady, refreshBalances, setMenuOpen } = wallet;
  const status = statusOf(market);
  const token = tokenSymbol(market);
  const fee = currentFeeBps(config, market);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!session) { setPosition(null); return; }
    fetchPositionAmounts(market, session.address).then((amounts) => {
      if (cancelled) return;
      setPosition((current) => {
        const sum = (values?: number[] | null) => (values ?? []).reduce((a, b) => a + b, 0);
        if (statusOf(market) === "open" && sum(amounts) < sum(current)) return current;
        return amounts;
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [market, session, balances.loaded]);

  if (status !== "open") {
    const next = openEvent
      ? <Link href={`/market?e=${encodeURIComponent(openEvent.key)}`}>{t("trade.seeOpen", { sym: esc(event.symbol) })}</Link>
      : <Link href={`/?cat=${event.category}&stock=${encodeURIComponent(event.symbol)}&status=all`}>{t("trade.seeAll", { sym: esc(event.symbol) })}</Link>;
    const closed = delayedUntil
      ? t("trade.closedDelayed", { close: fmtTs(market.closeTs), when: fmtTs(delayedUntil) })
      : status === "trading"
        ? t("trade.closedTrading", { close: fmtTs(market.closeTs), after: fmtTs(market.resolveAfterTs), final: fmtTs(market.resolveAfterTs + config.disputeWindowSecs) })
        : status === "proposed"
          ? t("trade.closedProposed", { ts: fmtTs(market.proposedAt + config.disputeWindowSecs), left: timeLeft(market.proposedAt + config.disputeWindowSecs) })
          : t("trade.closedSettled");
    return (
      <aside className="trade" id="trade">
        <div className="tcard">
          <div className="thead"><b>{delayedUntil ? t("status.delayed") : statusLabel(status)}</b></div>
          <p className="note" style={{ margin: 0 }}>{closed}</p>
          {next}
        </div>
        <PositionCard market={market} amounts={position} rangeName={rangeName} />
      </aside>
    );
  }

  const price = priceOf(market);
  const minExp = price ? minUnitExp(price, MIN_BET_USD, market.decimals) : null;
  const minRaw = Math.max(config.minBet, minExp != null ? toRaw(market, 10 ** minExp) : 0);
  const unitExp = minExp != null && minRaw === toRaw(market, 10 ** minExp) ? minExp : null;
  const minTxt = unitExp != null ? fmtUnit(unitExp) : fmtAmt(market, minRaw, 8);
  const balanceText = session && balances.loaded
    ? t("trade.balance", { amt: `${fmtAmt(market, shareBalance(market))} ${token}` })
    : session ? t("trade.balance", { amt: "…" }) : "";
  const total = market.pools.reduce((sum, value) => sum + value, 0);
  const raw = toRaw(market, Number(amount));
  const quote = quoteHtml({ market, bucket, raw, fee, minRaw, minTxt, token, rangeName });

  const shortOf = (have: number | null) => `${have != null ? t("trade.shortHave", { tok: esc(token), amt: `${fmtAmt(market, have)} ${esc(token)}` }) : t("trade.short", { tok: esc(token) })}${IS_TEST ? ` <a href="/faucet">${t("trade.getTest")}</a>` : ""}`;

  return (
    <aside className="trade" id="trade">
      <div className="tcard">
        <div className="thead"><b>{t("trade.stake", { tok: token })}</b><span className="note">{t("trade.pool", { iss: issuerOf(market) })}</span></div>
        <div className="topts">
          {market.pools.map((pool, index) => (
            <button key={index} type="button" className={bucket === index ? "on" : ""} style={{ ["--c" as string]: bucketColor(market, index) }} onClick={() => onBucket(index)}>
              <span className="to1"><span>{rangeName(index)}</span><b>{total ? Math.round((pool / total) * 100) + "%" : "—"}</b></span>
              <em>{bucketLabel(market, index)}</em>
            </button>
          ))}
        </div>
        <label className="tlabel" htmlFor="amt">{t("trade.amount")}<span className="note" id="bal">{balanceText}</span></label>
        <div className="tamt">
          <input
            id="amt"
            type="number"
            min={0}
            step={unitExp != null ? minTxt.replace(/,/g, "") : "any"}
            placeholder={minTxt}
            inputMode="decimal"
            value={amount}
            onChange={(event) => onAmount(event.target.value)}
            onBlur={() => {
              const value = Number(amount);
              if (unitExp != null && value >= 10 ** unitExp && !isUnitMultiple(value, unitExp)) onAmount(snapUnit(value, unitExp));
            }}
          />
          <span className="unit">{token}</span>
        </div>
        <RichText className="note" html={`${t(unitExp != null ? "trade.multiples" : "trade.minimum", { amt: `<b>${minTxt} ${esc(token)}</b>` })} ${usdOf(market, minRaw)}`} />
        {session && (
          <div className="tquick">
            <button type="button" onClick={() => onAmount(minTxt.replace(/,/g, ""))}>{t("trade.min")}</button>
            {[0.25, 0.5, 1].map((fraction) => (
              <button key={fraction} type="button" onClick={() => {
                const value = uiAmount(market, shareBalance(market)) * fraction;
                onAmount(unitExp != null ? snapUnit(value, unitExp) : String(Math.floor(value * 1e4) / 1e4));
              }}>{fraction === 1 ? t("trade.max") : `${fraction * 100}%`}</button>
            ))}
          </div>
        )}
        <RichText className="tsum" html={quote} />
        {session ? (
          <button className="primary big" id="go" type="button" disabled={bucket < 0 || busy} onClick={() => void place()}>{bucket < 0 ? t("trade.pickRange") : t("trade.stakeOn", { label: esc(rangeName(bucket)) })}</button>
        ) : (
          <button className="primary big" id="connect" type="button" onClick={(event) => { event.stopPropagation(); setMenuOpen(true); }}>{t("common.connectWallet")}</button>
        )}
        {message && <RichText html={message} />}
        <p className="note" style={{ margin: 0 }}>{t(Date.now() / 1000 < earlyBirdUntil(config, market) ? "trade.feeEarly" : "trade.fee", { fee: fee / 100 })}</p>
        <p className="note" style={{ margin: 0 }}>{t("trade.noHouse", { tok: token })}</p>
        {IS_TEST && session && balances.loaded && !shareBalance(market) && <RichText as="p" className="note" html={t("trade.noTokens", { tok: esc(token) })} />}
      </div>
      <PositionCard market={market} amounts={position} rangeName={rangeName} />
    </aside>
  );

  async function place() {
    if (!session) return;
    const stake = toRaw(market, Number(amount));
    if (stake < minRaw) { setMessage(`<div class="msg err">${t("trade.minIs", { amt: `${minTxt} ${esc(token)}` })}</div>`); return; }
    if (unitExp != null && !isUnitMultiple(Number(amount), unitExp)) {
      const snapped = Number(snapUnit(Number(amount), unitExp)).toLocaleString("en-US", { maximumFractionDigits: 8 });
      setMessage(`<div class="msg err">${t("trade.multiplesErr", { unit: `${minTxt} ${esc(token)}`, amt: `${snapped} ${esc(token)}` })}</div>`);
      return;
    }
    setBusy(true);
    if (!balances.loaded) {
      setMessage(`<div class="msg">${t("trade.checking")}</div>`);
      try { await refreshBalances(); } catch {}
    }
    const have = shareBalance(market);
    if (balanceReady() && stake > have) { setMessage(`<div class="msg err">${shortOf(have)}</div>`); setBusy(false); return; }
    setMessage(`<div class="msg">${t("trade.confirm")}</div>`);
    let signature: string;
    try {
      signature = await session.placeBet(market, bucket, stake, () => setMessage(`<div class="msg">${t("trade.sent")}</div>`));
    } catch (error) {
      const err = error as { message?: string; unconfirmed?: boolean; txid?: string; logs?: string[] };
      if (err?.unconfirmed && err?.txid) {
        setMessage(`<div class="msg err">${t("trade.unconfirmed", { tx: explorerTx(String(err.txid)) })}</div>`);
        return;
      }
      const rawText = String(err?.message ?? error) + " " + (Array.isArray(err?.logs) ? err.logs.join(" ") : "");
      let why = esc(String(err?.message ?? error).split(/ Logs:|\n/)[0].slice(0, 200));
      if (/insufficient lamports|Attempt to debit|insufficient funds for (fee|rent|gas)|exceeds the balance of the account/i.test(rawText)) why = t("trade.errSol");
      else if (/insufficient funds/i.test(rawText)) { try { await refreshBalances(); } catch {} why = shortOf(balanceReady() ? shareBalance(market) : null); }
      else if (/reject|denied|cancel/i.test(rawText)) why = t("trade.errCancel");
      else if (/429|rate limit/i.test(rawText)) why = t("trade.errBusy");
      setMessage(`<div class="msg err">${why}</div>`);
      setBusy(false);
      return;
    }
    const done = `${t("trade.staked", { amt: `${fmtAmt(market, stake, 8)} ${esc(token)}`, label: esc(fullLabel(bucket)) })} <a href="${explorerTx(signature)}" target="_blank" rel="noopener">${t("trade.viewTx")}</a>`;
    onAmount("");
    onStaked(bucket, stake);
    setPosition((current) => Array.from({ length: market.nBuckets }, (_, index) => (current?.[index] ?? 0) + (index === bucket ? stake : 0)));
    const show = (note = "") => setMessage(`<div class="msg ok">${done}${note ? `<br>${esc(note)}` : ""}</div>`);
    show();
    setBusy(false);
    await Promise.all([refreshBalances().catch(() => {}), onReload().catch(() => {})]);
    try { show((await bindReferralAfterBet(session)) || ""); } catch { show(); }
  }
}

function quoteHtml({ market, bucket, raw, fee, minRaw, minTxt, token, rangeName }: { market: MarketView; bucket: number; raw: number; fee: number; minRaw: number; minTxt: string; token: string; rangeName: (index: number) => string }) {
  if (bucket < 0) return `<span class="note">${t("trade.pickAbove")}</span>`;
  const multiple = payoutMultiple(market, bucket, fee);
  if (!raw) return `<div class="r"><span>${t("trade.paysIfRight")}</span><b>${multiple?.toFixed(2) ?? t("mkt.wholePot")}${multiple ? "×" : ""}</b></div>`;
  if (raw < minRaw) return `<span class="note">${t("trade.minIs", { amt: `${minTxt} ${esc(token)}` })}</span>`;
  const quote = impliedPayout(market, bucket, raw, fee);
  const feeNote = issuerFeeOf(market);
  return `<div class="r"><span>${t("trade.payoutIf", { label: esc(rangeName(bucket)) })}</span><b class="big">${fmtAmt(market, quote.total)} ${esc(token)}</b></div><div class="r note"><span>${usdOf(market, quote.total)}</span><span>${(quote.total / raw).toFixed(2)}× · +${fmtAmt(market, quote.total - raw)} ${esc(token)}</span></div><div class="note">${t("trade.otherRange", { amt: `${fmtAmt(market, raw)} ${esc(token)}` })}</div>${feeNote ? `<div class="note">${t("trade.issuerFeeNote", { iss: esc(issuerOf(market)), fee: feeNote })}</div>` : ""}`;
}

function PositionCard({ market, amounts, rangeName }: { market: MarketView; amounts: number[] | null; rangeName: (index: number) => string }) {
  if (!amounts) return null;
  const rows = amounts.slice(0, market.nBuckets).map((amount, index) => ({ amount, index })).filter((row) => row.amount > 0);
  if (!rows.length) return null;
  return (
    <div className="tcard" id="pos">
      <div className="thead"><b>{t("trade.position")}</b><Link href="/portfolio" className="note">{t("trade.allBets")}</Link></div>
      <div className="tsum">
        {rows.map((row) => (
          <div className="r" key={row.index}><span>{rangeName(row.index)}</span><b>{fmtAmt(market, row.amount, 8)} {tokenSymbol(market)}</b></div>
        ))}
      </div>
    </div>
  );
}
