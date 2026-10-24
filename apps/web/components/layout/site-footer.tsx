"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/config";
import { t, tn } from "@/lib/i18n";
import { esc } from "@/lib/text";
import { RichText } from "@/components/rich-text";

export function SiteFooter() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(API_BASE + "/config")
      .then((response) => response.json())
      .then((body) => {
        const secs = Number(body?.config?.disputeWindowSecs);
        if (cancelled || !(secs > 0)) return;
        setWindowLabel(secs % 3600 === 0 ? tn("hours", secs / 3600) : tn("minutes", Math.round(secs / 60)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const pool = t("foot.pool").replace(/(id="dwin">)[^<]*/, (_match, prefix) => prefix + (windowLabel ? esc(windowLabel) : "six hours"));

  return (
    <footer className="container foot">
      <RichText as="p" html={pool} />
      <RichText as="p" html={t("foot.issuer")} />
      <p className="social">
        <a href="https://x.com/bellpotxyz" target="_blank" rel="noopener">X @bellpotxyz</a>
        {" · "}
        <a href="https://github.com/bellpotxyz/bellpot" target="_blank" rel="noopener">GitHub</a>
        {" · "}
        <a href="mailto:hello@bellpot.xyz">hello@bellpot.xyz</a>
      </p>
    </footer>
  );
}
