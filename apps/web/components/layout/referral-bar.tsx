"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { lookupReferral, pendingReferral, rememberReferralCode, type ReferralLookup } from "@/lib/referral";
import { esc } from "@/lib/text";
import { RichText } from "@/components/rich-text";

export function ReferralBar() {
  const [lookup, setLookup] = useState<ReferralLookup | null>(null);

  useEffect(() => {
    rememberReferralCode();
    let cancelled = false;
    const load = () => {
      const code = pendingReferral();
      if (!code) { setLookup(null); return; }
      lookupReferral(code).then((result) => {
        if (cancelled) return;
        if (!result.valid || !pendingReferral()) { setLookup(null); return; }
        setLookup(result);
      }).catch(() => {});
    };
    load();
    const onBound = () => setLookup(null);
    document.addEventListener("bellpot:referral-bound", onBound);
    return () => { cancelled = true; document.removeEventListener("bellpot:referral-bound", onBound); };
  }, []);

  if (!lookup?.referrer || lookup.refereeBps == null) return null;
  const html = t("ref.bar", {
    who: `<b class="mono">${esc(lookup.referrer)}</b>`,
    pct: (lookup.refereeBps / 100).toFixed(0),
  });
  return (
    <div id="refbar" className="refbar">
      <RichText as="div" className="container" html={html} />
    </div>
  );
}
