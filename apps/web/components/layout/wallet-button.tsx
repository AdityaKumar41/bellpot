"use client";

import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import { IS_TEST, NATIVE, NATIVE_LOW } from "@/lib/config";
import { t } from "@/lib/i18n";
import { issuerOf, priceOf, STOCK_NAMES, STOCK_ORDER, uiAmount } from "@/lib/stocks";
import { short } from "@/lib/text";
import { useWallet } from "@/components/wallet/wallet-provider";
import { TickerBadge } from "./ticker-badge";

const TEST_WALLET = "Test wallet (browser)";

type WalletButtonProps = { onOpen?: () => void };

export function WalletButton({ onOpen }: WalletButtonProps) {
  const wallet = useWallet();
  const { session, balances, choices, menuOpen, setMenuOpen, tracked } = wallet;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: globalThis.MouseEvent) => {
      const box = document.getElementById("wallet");
      if (box && !box.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen, setMenuOpen]);

  const toggle = (event: ReactMouseEvent) => {
    event.stopPropagation();
    onOpen?.();
    setMenuOpen(!menuOpen);
  };

  if (!session) {
    return (
      <div id="wallet" className="walletbox">
        <button className="primary wbtn signup" id="wbtn" type="button" onClick={toggle}>{t("wallet.connect")}</button>
        {menuOpen && (
          <div className="menu" id="wmenu">
            <div className="mh">{t("wallet.connectTitle")}</div>
            {choices.map((choice) => (
              <button key={choice.name} type="button" onClick={() => wallet.connectChoice(choice).catch((error: unknown) => alert(error instanceof Error ? error.message : String(error)))}>
                {choice.name}
              </button>
            ))}
            {IS_TEST && (
              <button id="wdev" type="button" title={t("wallet.testTitle")} onClick={wallet.connectTest}>{t("wallet.test")}</button>
            )}
            {!choices.length && !IS_TEST && <div className="note" style={{ padding: 6 }}>{t("wallet.install")}</div>}
          </div>
        )}
      </div>
    );
  }

  const held = tracked
    .map((token) => ({ token, raw: balances.raw[token.mint] ?? 0 }))
    .filter((row) => row.raw > 0)
    .map((row) => {
      const amount = uiAmount(row.token.view, row.raw);
      const price = priceOf(row.token.view);
      return { ...row, amount, usd: price != null ? amount * price : null };
    })
    .sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1) || STOCK_ORDER.indexOf(a.token.symbol) - STOCK_ORDER.indexOf(b.token.symbol));
  const priced = held.filter((row) => row.usd != null);
  const total = priced.reduce((sum, row) => sum + (row.usd ?? 0), 0);
  const usd = (value: number) => "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const label = session.label === TEST_WALLET ? t("wallet.test") : session.label;

  return (
    <div id="wallet" className="walletbox">
      <button className="wbtn" id="wbtn" type="button" onClick={toggle}>
        <span className="dot" />
        <span className="mono">{short(session.address)}</span>
        {balances.loaded && <span className="note">{balances.native.toFixed(3)} {NATIVE}</span>}
      </button>
      {menuOpen && (
        <div className="menu wmenu" id="wmenu">
          <div className="whead">
            <div>
              <div className="mh">{label}</div>
              <button
                className="addr"
                id="wcopy"
                type="button"
                title={t("wallet.copyTitle")}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(session.address);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? t("common.copied") : short(session.address)}
              </button>
            </div>
            <button className="ghost" id="wdis" type="button" onClick={() => void wallet.disconnect()}>{t("wallet.disconnect")}</button>
          </div>
          <div className="wtotal">
            <span className="note">{t("wallet.stockTokens")}</span>
            <span className="sol">{balances.loaded ? `${balances.native.toFixed(3)} ${NATIVE}` : ""}</span>
            <b>{!balances.loaded ? "…" : priced.length ? usd(total) : held.length ? "—" : "$0.00"}</b>
          </div>
          {balances.loaded && balances.native < NATIVE_LOW && <div className="note warn" style={{ padding: "0 4px" }}>{t("wallet.lowSol")}</div>}
          <div className="wlist" id="wholdings">
            {!balances.loaded && <div className="note" style={{ padding: 4 }}>{t("wallet.loading")}</div>}
            {balances.loaded && held.length === 0 && <div className="note" style={{ padding: 4 }}>{t("wallet.none")}</div>}
            {balances.loaded && held.map((row) => (
              <div className="hold" key={row.token.mint}>
                <TickerBadge symbol={row.token.symbol} small />
                <span className="hname">
                  <b>{row.token.token}</b>
                  <small>{STOCK_NAMES[row.token.symbol] ?? row.token.symbol} · {issuerOf(row.token.view)}</small>
                </span>
                <span className="hamt">
                  <b>{row.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}</b>
                  <small>{row.usd != null ? usd(row.usd) : t("wallet.noPrice")}</small>
                </span>
              </div>
            ))}
          </div>
          <hr />
          <a className="mi" href="/portfolio">{t("nav.mybets")}</a>
        </div>
      )}
    </div>
  );
}
