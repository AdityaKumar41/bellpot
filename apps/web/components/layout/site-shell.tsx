"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { API_BASE, IS_TEST, NETWORK_NAME } from "@/lib/config";
import { setLang, t } from "@/lib/i18n";
import { LANGS } from "@/lib/lang";
import { categoryList, loadStocks, STOCK_META } from "@/lib/stocks";
import { useI18n } from "@/lib/i18n";
import { useWallet } from "@/components/wallet/wallet-provider";
import { BrandMark } from "./brand-mark";
import { FeedbackWidget } from "./feedback-widget";
import { ReferralBar } from "./referral-bar";
import { SiteFooter } from "./site-footer";
import { WalletButton } from "./wallet-button";

const NAV = [
  { href: "/", key: "nav.home", icon: "home" },
  { href: "/?status=all", key: "nav.all", icon: "markets" },
  { href: "/leaderboard", key: "nav.leaderboard", icon: "board" },
  { href: "/portfolio", key: "nav.mybets", icon: "bets" },
  { href: "/invite", key: "nav.invite", icon: "invite" },
  { href: "/docs", key: "nav.docs", icon: "docs" },
  { href: "/faucet", key: "nav.faucet", icon: "faucet", faucet: true },
] as const;

export type SiteShellProps = {
  children: ReactNode;
  rail?: ReactNode;
  category?: string;
  query?: string;
  onSearch?: (query: string) => void;
  onCategory?: (category: string) => void;
  footer?: boolean;
};

export function SiteShell({ children, rail, category = "", query = "", onSearch, onCategory, footer = false }: SiteShellProps) {
  const path = usePathname();
  const { lang } = useI18n();
  const { menuOpen, setMenuOpen } = useWallet();
  const [navOpen, setNavOpen] = useState(false);
  const [draft, setDraft] = useState(query);
  const [listed, setListed] = useState(false);
  const faucetOn = IS_TEST && !!API_BASE;
  const links = NAV.filter((link) => !("faucet" in link && link.faucet) || faucetOn);

  useEffect(() => setDraft(query), [query]);
  useEffect(() => { loadStocks().then(() => setListed(true)).catch(() => {}); }, []);
  useEffect(() => { if (menuOpen) setNavOpen(false); }, [menuOpen]);

  const known = Object.values(STOCK_META);
  const categories = categoryList().filter(([key]) => !listed || !known.length || known.some((meta) => meta.category === key));

  return (
    <>
      <div className={rail ? "app with-rail" : "app"}>
        <header className="app-top">
          <Link className="brand" href="/">
            <BrandMark />
            <span>BellPot</span>
          </Link>
          <label className="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input
              id="q"
              type="search"
              placeholder={t("top.searchPh")}
              aria-label={t("top.searchAria")}
              value={draft}
              onChange={(event) => {
                const next = event.target.value;
                setDraft(next);
                onSearch?.(next.trim());
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !onSearch) location.href = "/?q=" + encodeURIComponent(draft.trim());
              }}
            />
          </label>
          <div className="app-actions">
            <WalletButton onOpen={() => setNavOpen(false)} />
            <button className="iconbtn" id="navmore" type="button" aria-label={t("nav.menu")} aria-expanded={navOpen} onClick={() => { setMenuOpen(false); setNavOpen((open) => !open); }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
          </div>
        </header>
        <aside className={navOpen ? "side open" : "side"}>
          <nav className="sidenav" aria-label={t("nav.menu")}>
            {links.map((link) => {
              const on = link.href === "/" ? path === "/" : path === link.href;
              return (
                <Link key={link.href} className={on ? "on" : undefined} href={link.href} id={link.href === "/faucet" ? "faucetlink" : undefined} onClick={() => setNavOpen(false)}>
                  <NavIcon name={link.icon} />
                  <span>{t(link.key)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="sidefoot">
            {IS_TEST && (faucetOn
              ? <Link className="netbadge" href="/faucet" title={t("net.titleFaucet")}>{NETWORK_NAME}</Link>
              : <span className="netbadge" title={t("net.title")}>{NETWORK_NAME}</span>)}
            <select id="langsel" className="langsel" aria-label={t("lang.label")} title={t("lang.label")} value={lang} onChange={(event) => setLang(event.target.value)}>
              {LANGS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </div>
        </aside>
        <div className="app-main">
          <ReferralBar />
          {onCategory && (
            <nav className="chips" aria-label={t("top.catAria")}>
              <CategoryLink active={category} label={t("dash.trending")} value="all" onCategory={onCategory} />
              {categories.map(([key, label]) => (
                <CategoryLink key={key} active={category} label={label} value={key} onCategory={onCategory} />
              ))}
            </nav>
          )}
          {children}
        </div>
        {rail && <aside className="rail">{rail}</aside>}
        {footer && <SiteFooter />}
      </div>
      <FeedbackWidget />
    </>
  );
}

function CategoryLink({ active, label, value, onCategory }: { active: string; label: string; value: string; onCategory?: (category: string) => void }) {
  const className = active === value ? "on" : undefined;
  if (onCategory) {
    return <button type="button" data-s={value} className={className} onClick={() => onCategory(value)}>{label}</button>;
  }
  const href = value === "all" ? "/" : "/?cat=" + encodeURIComponent(value);
  return <Link href={href} className={className}>{label}</Link>;
}

function NavIcon({ name }: { name: string }) {
  const common = { viewBox: "0 0 24 24", width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "home") return <svg {...common}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></svg>;
  if (name === "markets") return <svg {...common}><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></svg>;
  if (name === "board") return <svg {...common}><path d="M5 19V10M12 19V5M19 19v-8" /></svg>;
  if (name === "bets") return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12h8M12 8v8" /></svg>;
  if (name === "invite") return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-3 2.7-4.5 5.5-4.5S14.4 16 15 19" /><circle cx="17" cy="9" r="2.2" /><path d="M16.2 14.6c2.2.3 3.8 1.6 4.3 4.4" /></svg>;
  if (name === "faucet") return <svg {...common}><path d="M8 3h8M12 3v6M8 21h8a4 4 0 0 0 4-4c0-4-4-5-4-8H8c0 3-4 4-4 8a4 4 0 0 0 4 4z" /></svg>;
  return <svg {...common}><path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" /><path d="M9 12h6M9 16h4" /></svg>;
}
