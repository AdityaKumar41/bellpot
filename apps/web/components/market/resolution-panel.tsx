"use client";

import { useEffect, useState } from "react";
import { API_BASE, explorerTx } from "@/lib/config";
import type { ConfigView, MarketView } from "@/lib/chain-core";
import { t, tn } from "@/lib/i18n";
import { fmtMove } from "@/lib/stocks";
import { dayEnd, fmtTs } from "@/lib/time";
import { esc } from "@/lib/text";
import { encodeSig } from "@/lib/wallet";
import { useWallet } from "@/components/wallet/wallet-provider";
import { RichText } from "@/components/rich-text";

type ResolutionPanelProps = {
  market: MarketView;
  config: ConfigView;
  fullLabel: (index: number) => string;
  delayedUntil: number;
};

export function ResolutionPanel({ market, config, fullLabel, delayedUntil }: ResolutionPanelProps) {
  if (!market.proposedAt) {
    return <p className="note">{delayedUntil ? t("mkt.delayed", { when: fmtTs(delayedUntil) }) : t("res.pending", { ts: fmtTs(market.resolveAfterTs) })}</p>;
  }
  return (
    <div className="kv">
      <b>{t("res.proposed")}</b>
      <span>
        {fmtTs(market.proposedAt)} · <RichText html={t("res.move", { move: `<span class="mono">${fmtMove(market.proposedValue)}</span>` })} />
        {" → "}
        <b>{fullLabel(market.proposedOutcome)}</b>
      </span>
      <b>{t("res.evidence")}</b>
      <Evidence market={market} />
      {market.status === 1 && (
        <>
          <b>{t("res.disagree")}</b>
          <Dispute market={market} config={config} />
        </>
      )}
    </div>
  );
}

function Dispute({ market, config }: { market: MarketView; config: ConfigView }) {
  const { session, setMenuOpen } = useWallet();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/disputes?market=${encodeURIComponent(market.address)}`)
      .then((response) => response.json())
      .then((body) => {
        const open = (body.disputes ?? []).filter((row: { status?: string }) => row.status === "open");
        if (!cancelled && open.length) setNote(tn("res.disputesOpen", open.length));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [market.address]);

  return (
    <span>
      <button
        id="dbtn"
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!session) { setMenuOpen(true); return; }
          const reason = prompt(t("res.promptWhy"));
          if (!reason || reason.trim().length < 5) return;
          const claimed = prompt(t("res.promptMove")) ?? "";
          setBusy(true);
          try {
            const message = `bellpot-dispute v1\nmarket=${market.address}\nwallet=${session.address}\nclaimed=${claimed.trim()}\nreason=${reason.trim().slice(0, 2000)}`;
            const signature = await session.signMessage(new TextEncoder().encode(message));
            const response = await fetch(`${API_BASE}/dispute`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ market: market.address, wallet: session.address, reason: reason.trim().slice(0, 2000), claimedValue: claimed.trim() || null, signature: encodeSig(signature) }),
            });
            const body = await response.json();
            if (!response.ok) throw new Error(body.error ?? "failed");
            setNote(t("res.disputeFiled"));
          } catch (error) {
            alert(error instanceof Error ? error.message : String(error));
            setBusy(false);
          }
        }}
      >
        {t("res.dispute")}
      </button>
      {" "}
      <span className="note">{t("res.disputeUntil", { ts: fmtTs(market.proposedAt + config.disputeWindowSecs) })}</span>
      <div id="dlist" className="note">{note}</div>
    </span>
  );
}

function Evidence({ market }: { market: MarketView }) {
  const [html, setHtml] = useState<string | null>(null);
  const [plain, setPlain] = useState(t("res.loading"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/evidence/${market.id}`);
        if (!response.ok) { if (!cancelled) setPlain(t("res.notPublished")); return; }
        const evidence = await response.json();
        const raw = await (await fetch(`${API_BASE}/evidence/${market.id}/raw`)).arrayBuffer();
        const sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", raw))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
        const match = sha === market.snapshotHash;
        const dividend = Number(evidence.dividend) > 0 ? " " + t("ev.dividend", { amt: "$" + esc(evidence.dividend) }) : "";
        const dayTs = (date: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? fmtTs(dayEnd(String(date))) : String(date));
        const fp = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 8 : 4 }) : esc(value); };
        const head = evidence.samples != null
          ? `<div><b>${esc(evidence.symbol)}</b> ${t("ev.close")} ${esc(dayTs(evidence.prevDate))} <span class="mono">$${fp(evidence.baseline)}</span> (${t("ev.median", { n: esc(evidence.prevSamples) })}) → ${esc(dayTs(evidence.date))} <span class="mono">$${fp(evidence.close)}</span> (${t("ev.medianHour", { n: esc(evidence.samples) })}) = <span class="mono">${fmtMove(evidence.movePpm)}</span></div>`
          : `<div><b>${esc(evidence.symbol)}</b> ${t("ev.close")} ${esc(evidence.prevDate)} <span class="mono">$${esc(evidence.prevClose)}</span> → ${esc(evidence.date)} <span class="mono">$${esc(evidence.close)}</span>${dividend} = <span class="mono">${fmtMove(evidence.movePpm)}</span>${evidence.split ? ` · ${t("ev.split", { x: esc(evidence.split) })}` : ""}</div>`;
        const tx = evidence.tx ?? evidence.signature;
        const body = `${head}<div><a href="${API_BASE}/evidence/${market.id}/raw" target="_blank" rel="noopener">${evidence.samples != null ? t("ev.sampled") : t("ev.raw")}</a> · sha256 <span class="hash">${sha.slice(0, 16)}…</span> · <span class="${match ? "" : "warn"}">${match ? t("ev.match") : t("ev.mismatch")}</span></div>${tx ? `<div><a href="${explorerTx(String(tx))}" target="_blank" rel="noopener">${t("ev.proposalTx")}</a></div>` : ""}`;
        if (!cancelled) { setHtml(body); setPlain(""); }
      } catch {
        if (!cancelled) setPlain(t("res.notPublished"));
      }
    })();
    return () => { cancelled = true; };
  }, [market.id, market.snapshotHash]);

  if (html) return <RichText as="span" html={html} />;
  return <span id="evidence" className="note">{plain}</span>;
}
