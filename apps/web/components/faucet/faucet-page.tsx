"use client";

import { useEffect, useState } from "react";
import { API_BASE, IS_TEST, explorerTx } from "@/lib/config";
import { fetchMarkets } from "@/lib/chain";
import { t } from "@/lib/i18n";
import { STOCK_META, STOCK_ORDER, loadPrices, loadStocks, tokensOf } from "@/lib/stocks";
import { esc, short } from "@/lib/text";
import { RichText } from "@/components/rich-text";
import { SiteShell } from "@/components/layout/site-shell";
import { TickerBadge } from "@/components/layout/ticker-badge";
import { useWallet } from "@/components/wallet/wallet-provider";

export function FaucetPage() {
  const wallet = useWallet();
  const { trackStocks } = wallet;
  const [tokens, setTokens] = useState<{ symbol: string; amount: number; token: string; issuer: string }[]>([]);
  const [listed, setListed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [markets] = await Promise.all([fetchMarkets(), loadStocks(), loadPrices()]);
        if (cancelled) return;
        trackStocks(markets);
        setTokens(STOCK_ORDER.filter((symbol) => STOCK_META[symbol]?.active !== false).flatMap((symbol) => tokensOf(symbol).map((token) => ({
          symbol, amount: token.faucetUi ?? 2, token: token.token, issuer: token.issuer,
        }))));
        setListed(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [trackStocks]);

  return (
    <SiteShell>
      <div className="pagehead"><h1>{t("fc.h1")}</h1></div>
      <div className="fwrap">
        <div className="fcard">
          <RichText as="p" html={t("fc.intro")} />
          <div>
            <div className="tlabel">{t("fc.sendsLabel")}</div>
            <div className="ftoks" id="ftokens">
              {!listed && tokens.length === 0 && <span className="note">{t("common.loading")}</span>}
              {listed && tokens.length === 0 && <span className="note">{t("fc.none")}</span>}
              {tokens.map((token) => (
                <span className="ftok" key={token.symbol + token.token}>
                  <TickerBadge symbol={token.symbol} small />
                  <b>{token.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })} {token.token}</b>
                  <span className="note">{token.issuer}</span>
                </span>
              ))}
              <span className="ftok"><b>+ 0.01 SOL</b><span className="note">{t("fc.forFees")}</span></span>
            </div>
          </div>
          <ol className="fsteps">
            <RichText as="li" html={t("fc.s1")} />
            <RichText as="li" html={t("fc.s2")} />
            <RichText as="li" html={t("fc.s3")} />
          </ol>
        </div>
        <div className="fcard" id="faucet">
          {error && <RichText className="msg err" html={t("fc.loadErr", { err: esc(error) })} />}
          {!error && !IS_TEST && <p style={{ margin: 0 }}>{t("fc.testOnly")}</p>}
          {!error && IS_TEST && !wallet.session && (
            <>
              <div className="thead"><b>{t("fc.get")}</b></div>
              <p className="note" style={{ margin: 0 }}>{t("fc.connectFirst")}</p>
              <button className="primary big" type="button" onClick={(event) => { event.stopPropagation(); wallet.setMenuOpen(true); }}>{t("common.connectWallet")}</button>
            </>
          )}
          {!error && IS_TEST && wallet.session && (
            <>
              <div className="thead"><b>{t("fc.get")}</b><span className="note mono">{short(wallet.session.address)}</span></div>
              <p className="note" style={{ margin: 0 }}>{t("fc.sends")}</p>
              <button
                className="primary big"
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setResult("");
                  try {
                    const response = await fetch(API_BASE + "/faucet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: wallet.session!.address }) });
                    const body = await response.json();
                    setResult(response.ok
                      ? `<div class="msg ok">${t("fc.sent", { what: esc(body.sent) })} ${(body.signatures ?? []).map((sig: string, index: number) => `<a href="${explorerTx(sig)}" target="_blank" rel="noopener">tx ${index + 1}</a>`).join(" · ")}<br><a href="/">${t("fc.pick")}</a></div>`
                      : `<div class="msg err">${esc(body.error ?? t("fc.err"))}</div>`);
                  } catch {
                    setResult(`<div class="msg err">${t("fc.unreachable")}</div>`);
                  }
                  setBusy(false);
                  await wallet.refreshBalances();
                }}
              >
                {busy ? t("fb.sending") : t("fc.get")}
              </button>
              {result && <RichText html={result} />}
            </>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
