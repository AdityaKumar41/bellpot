"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE, explorerAddress } from "@/lib/config";
import { t } from "@/lib/i18n";
import { short } from "@/lib/text";
import { RichText } from "@/components/rich-text";
import { SiteShell } from "@/components/layout/site-shell";
import { useWallet } from "@/components/wallet/wallet-provider";

const WINDOWS = [["all", "lb.all"], ["30d", "lb.30d"], ["7d", "lb.7d"]] as const;

type Entry = { rank: number; wallet: string; points: number; markets: number; won: number; test?: boolean };

function fmtPoints(value: number) {
  if (!isFinite(value) || value <= 0) return "0";
  if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
  if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
  if (value >= 1e3) return (value / 1e3).toFixed(1) + "k";
  return value.toFixed(0);
}

export function LeaderboardPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { session } = useWallet();
  const requested = params.get("window") ?? "all";
  const windowKey = WINDOWS.some(([key]) => key === requested) ? requested : "all";
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [totals, setTotals] = useState<{ players?: number; markets?: number; points?: number }>({});
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(false);
    fetch(`${API_BASE}/leaderboard?window=${encodeURIComponent(windowKey)}&limit=100`)
      .then((response) => { if (!response.ok) throw new Error("leaderboard " + response.status); return response.json(); })
      .then((body) => { if (!cancelled) { setRows(body.entries ?? []); setTotals(body.totals ?? {}); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [windowKey, session?.address]);

  return (
    <SiteShell>
      <div className="pagehead"><h1>{t("nav.leaderboard")}</h1></div>
      <div id="windows" className="tabs" role="tablist">
        {WINDOWS.map(([key, label]) => (
          <button key={key} type="button" className={`tab${key === windowKey ? " on" : ""}`} role="tab" onClick={() => router.replace(`/leaderboard?window=${key}`)}>{t(label)}</button>
        ))}
      </div>
      <RichText className="note" html={t("lb.how")} />
      <div className="lbstats">
        <div><b>{String(totals.players ?? 0)}</b><span>{t("lb.players")}</span></div>
        <div><b>{String(totals.markets ?? 0)}</b><span>{t("lb.settled")}</span></div>
        <div><b>{fmtPoints(totals.points ?? 0)}</b><span>{t("lb.awarded")}</span></div>
      </div>
      <div id="board">
        {error && <div className="note">{t("lb.err")}</div>}
        {!error && rows == null && <div className="note">{t("common.loading")}</div>}
        {!error && rows?.length === 0 && <div className="note">{t("lb.empty")}</div>}
        {!error && !!rows?.length && (
          <div className="scroll">
            <table className="tbl">
              <thead><tr><th>#</th><th>{t("lb.colWallet")}</th><th className="r">{t("lb.colPoints")}</th><th className="r">{t("lb.colMarkets")}</th><th className="r">{t("lb.colWon")}</th></tr></thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.wallet} style={entry.wallet === session?.address ? { background: "var(--ok-bg)" } : undefined}>
                    <td className="mono">{Number(entry.rank)}</td>
                    <td>
                      <a className="mono" href={explorerAddress(entry.wallet)} target="_blank" rel="noopener">{short(entry.wallet)}</a>
                      {entry.wallet === session?.address && <> <b>{t("lb.you")}</b></>}
                      {entry.test && <> <span className="note">{t("lb.test")}</span></>}
                    </td>
                    <td className="r mono"><b>{fmtPoints(entry.points)}</b></td>
                    <td className="r mono">{Number(entry.markets)}</td>
                    <td className="r mono">{Number(entry.won)} / {Number(entry.markets)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
