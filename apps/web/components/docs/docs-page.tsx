"use client";

import { useEffect, useRef } from "react";
import { fetchMarkets } from "@/lib/chain";
import { t } from "@/lib/i18n";
import { loadStocks } from "@/lib/stocks";
import { localizeUtc } from "@/lib/time";
import { RichText } from "@/components/rich-text";
import { SiteShell } from "@/components/layout/site-shell";
import { useWallet } from "@/components/wallet/wallet-provider";

const TOC = ["why", "market", "money", "points", "settle", "trust", "tokens", "chain", "try", "api", "faq"] as const;

const LISTS: Record<string, { tag: "ul" | "ol"; keys: string[] }> = {
  why: { tag: "ul", keys: ["docs.why.2", "docs.why.3", "docs.why.4"] },
  market: { tag: "ol", keys: ["docs.market.1", "docs.market.2", "docs.market.3", "docs.market.4", "docs.market.5"] },
  money: { tag: "ul", keys: ["docs.money.1", "docs.money.2", "docs.money.3", "docs.money.4", "docs.money.5", "docs.money.6"] },
  points: { tag: "ul", keys: ["docs.points.3", "docs.points.4", "docs.points.5"] },
  settle: { tag: "ol", keys: ["docs.settle.1", "docs.settle.2", "docs.settle.3", "docs.settle.4", "docs.settle.5"] },
  trust: { tag: "ul", keys: ["docs.trust.1", "docs.trust.2", "docs.trust.3", "docs.trust.4", "docs.trust.5", "docs.trust.6"] },
  tokens: { tag: "ul", keys: ["docs.tokens.1", "docs.tokens.2", "docs.tokens.3", "docs.tokens.4"] },
  chain: { tag: "ul", keys: ["docs.chain.2", "docs.chain.3", "docs.chain.4", "docs.chain.5", "docs.chain.6", "docs.chain.7", "docs.chain.8"] },
  try: { tag: "ol", keys: ["docs.try.1", "docs.try.2", "docs.try.3"] },
  api: { tag: "ul", keys: ["docs.api.2", "docs.api.3", "docs.api.4", "docs.api.5", "docs.api.6"] },
};

const FAQ: [string, string][] = [["docs.faq.1", "docs.faq.2"], ["docs.faq.3", "docs.faq.4"], ["docs.faq.5", "docs.faq.6"], ["docs.faq.7", "docs.faq.8"], ["docs.faq.9", "docs.faq.10"]];

export function DocsPage() {
  const root = useRef<HTMLElement>(null);
  const { trackStocks } = useWallet();

  useEffect(() => {
    if (root.current) localizeUtc(root.current);
  });
  useEffect(() => {
    Promise.all([fetchMarkets(), loadStocks()]).then(([markets]) => trackStocks(markets)).catch(() => {});
  }, [trackStocks]);

  return (
    <SiteShell footer>
      <article className="docs" ref={root} style={{ maxWidth: 860 }}>
        <div className="pagehead"><h1>{t("docs.intro.1")}</h1></div>
        <RichText as="p" className="lead" html={t("docs.intro.2")} />
        <div className="fcard vid">
          <video controls preload="metadata" playsInline src="/demo.mp4" poster="/demo-poster.jpg" />
          <p className="note" style={{ margin: 0 }}>{t("docs.intro.3")}</p>
        </div>
        <nav className="toc">
          {TOC.map((id) => <a key={id} href={`#${id}`}>{t(`docs.toc.${id}`)}</a>)}
        </nav>
        <Section id="why" title="docs.why.h" intro={["docs.why.1"]} />
        <Section id="market" title="docs.market.h" after={["docs.market.6"]} />
        <Section id="money" title="docs.money.h" />
        <Section id="points" title="docs.points.h" intro={["docs.points.1", "docs.points.2"]} />
        <Section id="settle" title="docs.settle.h" />
        <Section id="trust" title="docs.trust.h" />
        <Section id="tokens" title="docs.tokens.h" />
        <Section id="chain" title="docs.chain.h" intro={["docs.chain.1"]} />
        <Section id="try" title="docs.try.h" after={["docs.try.4"]} />
        <Section id="api" title="docs.api.h" intro={["docs.api.1"]} after={["docs.api.7"]} />
        <h2 id="faq">{t("docs.faq.h")}</h2>
        <dl className="faq">
          {FAQ.map(([question, answer]) => (
            <span key={question}>
              <dt>{t(question)}</dt>
              <dd>{t(answer)}</dd>
            </span>
          ))}
        </dl>
      </article>
    </SiteShell>
  );
}

function Section({ id, title, intro = [], after = [] }: { id: string; title: string; intro?: string[]; after?: string[] }) {
  const list = LISTS[id];
  const ListTag = list?.tag === "ol" ? "ol" : "ul";
  return (
    <section>
      <h2 id={id}>{t(title)}</h2>
      {intro.map((key) => <RichText as="p" key={key} html={t(key)} />)}
      {list && (
        <ListTag className={list.tag === "ol" ? "fsteps big" : undefined}>
          {list.keys.map((key) => <RichText as="li" key={key} html={t(key)} />)}
        </ListTag>
      )}
      {after.map((key) => <RichText as="p" key={key} html={t(key)} />)}
    </section>
  );
}
