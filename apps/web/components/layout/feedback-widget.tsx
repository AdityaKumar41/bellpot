"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/config";
import { t } from "@/lib/i18n";
import { useWallet } from "@/components/wallet/wallet-provider";
import { RichText } from "@/components/rich-text";

export function FeedbackWidget() {
  const { session } = useWallet();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  if (!API_BASE) return null;

  const hint = t("fb.orEmail", { email: `<a href="mailto:hello@bellpot.xyz">hello@bellpot.xyz</a>` });

  return (
    <>
      {!open && (
        <button id="fbbtn" className="fbbtn" type="button" aria-label={t("fb.button")} onClick={() => { setOpen(true); setDone(false); setNote(null); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16v11H8l-4 4z" /></svg>
          <span>{t("fb.button")}</span>
        </button>
      )}
      {open && (
        <div id="fbbox" className="fbbox">
          {done ? (
            <>
              <div className="fbhead"><b>{t("fb.thanks")}</b></div>
              <div className="note">{t("fb.thanksNote")}</div>
            </>
          ) : (
            <>
              <div className="fbhead">
                <b>{t("fb.head")}</b>
                <button className="ghost" id="fbx" type="button" aria-label={t("common.close")} onClick={() => setOpen(false)}>✕</button>
              </div>
              <textarea id="fbmsg" rows={5} maxLength={4000} placeholder={t("fb.msgPh")} value={message} onChange={(event) => { setMessage(event.target.value); setNote(null); }} />
              <input id="fbcontact" maxLength={200} placeholder={t("fb.contactPh")} value={contact} onChange={(event) => setContact(event.target.value)} />
              <input id="fbweb" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999 }} value={website} onChange={(event) => setWebsite(event.target.value)} />
              <div className="fbrow">
                {note ? <span className="note" id="fbnote">{note}</span> : <RichText className="note" html={hint} />}
                <button
                  className="primary"
                  id="fbsend"
                  type="button"
                  disabled={sending}
                  onClick={async () => {
                    if (message.trim().length < 5) { setNote(t("fb.tooShort")); return; }
                    setSending(true);
                    try {
                      const response = await fetch(API_BASE + "/feedback", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ message, contact, website, page: location.pathname + location.search, wallet: session ? session.address : null }),
                      });
                      const body = await response.json().catch(() => ({}));
                      if (!response.ok) throw new Error(body.error ?? "HTTP " + response.status);
                      setDone(true);
                      setTimeout(() => setOpen(false), 2500);
                    } catch (error) {
                      setNote(t("fb.fail", { err: error instanceof Error ? error.message : String(error) }));
                      setSending(false);
                    }
                  }}
                >
                  {sending ? t("fb.sending") : t("fb.send")}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
