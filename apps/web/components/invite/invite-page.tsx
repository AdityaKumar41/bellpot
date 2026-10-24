"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE, explorerTx } from "@/lib/config";
import { t } from "@/lib/i18n";
import { esc, short } from "@/lib/text";
import { RichText } from "@/components/rich-text";
import { SiteShell } from "@/components/layout/site-shell";
import { useWallet } from "@/components/wallet/wallet-provider";

type Tier = { points: number; bps: number };
type Earned = { token?: string; mint: string; earned: number | null; asReferrer: number | null; asReferee: number | null; paid: number | null; usd: number | null };
type Payout = { amount: number; token?: string; signature: string };
type InviteView = {
  eligible?: boolean;
  code?: string;
  link?: string;
  error?: string;
  tiers: Tier[];
  tierBps: number;
  refereeBps: number;
  referred: number;
  earnedUsd: number;
  points: number;
  nextTier?: { points: number; bps: number } | null;
  bound?: { code: string; referrer: string } | null;
  earned: Earned[];
  payouts: Payout[];
};

async function readJson(response: Response): Promise<InviteView & { error?: string }> {
  const text = await response.text();
  try { return JSON.parse(text) as InviteView & { error?: string }; }
  catch { return { error: response.ok ? "bad response" : "HTTP " + response.status } as InviteView & { error?: string }; }
}

const usd = (value: number) => "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (bps: number) => (bps / 100).toFixed(0) + "%";
const fmt = (value: number | null) => (value == null ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: 6 }));

export function InvitePage() {
  const { session } = useWallet();
  const [view, setView] = useState<InviteView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const wallet = session?.address ?? null;

  const load = useCallback(async () => {
    if (!wallet) { setView(null); setError(null); return; }
    try {
      let response = await fetch(`${API_BASE}/referral/${wallet}`);
      let body = await readJson(response);
      if (body.eligible && !body.code) {
        response = await fetch(`${API_BASE}/referral/code`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wallet }) });
        body = await readJson(response);
      }
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "HTTP " + response.status);
      setView(body);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [wallet]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onBound = () => void load();
    document.addEventListener("bellpot:referral-bound", onBound);
    return () => document.removeEventListener("bellpot:referral-bound", onBound);
  }, [load]);

  return (
    <SiteShell>
      <div className="pagehead"><h1>{t("inv.h1")}</h1></div>
      <div className="fwrap" id="invite">
        {!wallet && <div className="fcard"><div className="note">{t("inv.connect")}</div></div>}
        {wallet && !view && !error && <div className="fcard"><div className="note">{t("common.loading")}</div></div>}
        {error && <div className="fcard"><div className="msg err">{error}</div></div>}
        {view && (
          <>
            <div className="fcard">
              <h2 style={{ margin: 0 }}>{t("inv.yourLink")}</h2>
              {view.eligible ? (
                <>
                  <div className="linkbox">
                    <input className="mono" id="link" readOnly value={view.link ?? ""} />
                    <button className="primary" type="button" onClick={async () => {
                      try { await navigator.clipboard.writeText(view.link ?? ""); setCopied(true); } catch { }
                      setTimeout(() => setCopied(false), 1500);
                    }}>{copied ? t("common.copied") : t("inv.copy")}</button>
                  </div>
                  <div className="note"><RichText html={t("inv.code", { code: `<b class="mono">${esc(view.code)}</b>` })} /></div>
                </>
              ) : <RichText className="msg" html={t("inv.locked")} />}
              <div className="lbstats four">
                <div><span className="note">{t("inv.invited")}</span><b>{view.referred}</b></div>
                <div><span className="note">{t("inv.share")}</span><b>{pct(view.tierBps)}</b></div>
                <div><span className="note">{t("inv.earnedAll")}</span><b>{usd(view.earnedUsd)}</b></div>
                <div><span className="note">{t("inv.points")}</span><b>{Math.round(view.points).toLocaleString("en-US")}</b></div>
              </div>
              {view.nextTier && <div className="note">{t("inv.next", { n: (view.nextTier.points - view.points).toLocaleString("en-US", { maximumFractionDigits: 0 }), pct: pct(view.nextTier.bps) })}</div>}
              {view.bound && <div className="note"><RichText html={t("inv.joined", { code: `<b class="mono">${esc(view.bound.code)}</b>`, who: esc(view.bound.referrer), pct: pct(view.refereeBps) })} /></div>}
            </div>
            <div className="fcard">
              <h3 style={{ margin: 0 }}>{t("inv.byToken")}</h3>
              <div className="note">{t("inv.byTokenNote")}</div>
              {view.earned.length === 0 ? <div className="note">{t("inv.nothing")}</div> : (
                <div className="scroll">
                  <table className="tbl">
                    <thead><tr><th>{t("inv.colToken")}</th><th className="r">{t("inv.colEarned")}</th><th className="r">{t("inv.colReferrer")}</th><th className="r">{t("inv.colInvitee")}</th><th className="r">{t("inv.colPaid")}</th><th className="r">≈ USD</th></tr></thead>
                    <tbody>
                      {view.earned.map((row) => (
                        <tr key={row.mint}><td><b>{row.token ?? short(row.mint)}</b></td><td className="r mono">{fmt(row.earned)}</td><td className="r mono">{fmt(row.asReferrer)}</td><td className="r mono">{fmt(row.asReferee)}</td><td className="r mono">{fmt(row.paid)}</td><td className="r">{row.usd != null ? usd(row.usd) : "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!!view.payouts.length && <div className="note" style={{ marginTop: 8 }}>{t("inv.lastPayouts")} {view.payouts.slice(0, 5).map((payout, index) => <span key={payout.signature}>{index ? " · " : ""}{fmt(payout.amount)} {payout.token ?? ""} <a href={explorerTx(payout.signature)} target="_blank" rel="noopener">tx</a></span>)}</div>}
            </div>
            <div className="fcard">
              <h3 style={{ margin: 0 }}>{t("inv.how")}</h3>
              <ol className="fsteps">
                <RichText as="li" html={t("inv.how1")} />
                <li>{t("inv.how2", { pct: pct(view.refereeBps) })}</li>
                <li>{t("inv.how3")}</li>
              </ol>
              <table className="tbl">
                <thead><tr><th>{t("inv.colAllTime")}</th><th className="r">{t("inv.share")}</th></tr></thead>
                <tbody>
                  {view.tiers.map((tier) => (
                    <tr key={tier.bps} className={tier.bps === view.tierBps ? "sel" : undefined}>
                      <td>{tier.points ? t("inv.tierPoints", { n: tier.points.toLocaleString("en-US") }) : t("inv.tierFirst")}</td>
                      <td className="r"><RichText html={t("inv.tierShare", { pct: `<b>${pct(tier.bps)}</b>` })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </SiteShell>
  );
}
