"use client";

import en from "@bellpot/i18n/en.json";
import { createContext, useContext, type ReactNode } from "react";
import { LANGS } from "./lang";

const english = en as Record<string, string>;

type Pack = {
  lang: string;
  dict: Record<string, string>;
  plural: Intl.PluralRules;
};

let current: Pack = { lang: "en", dict: english, plural: new Intl.PluralRules("en") };

/** Installed by `I18nProvider` before children render, so plain helpers can call `t` during render. */
export function bindI18n(lang: string, messages: Record<string, string>) {
  const safe = LANGS.some(([code]) => code === lang) ? lang : "en";
  current = {
    lang: safe,
    dict: { ...english, ...messages },
    plural: new Intl.PluralRules(safe),
  };
}

export const dateLocale = () => (current.lang === "en" ? "en-GB" : current.lang);
export const dayLocale = () => (current.lang === "en" ? "en-US" : current.lang);

/** The string for `key` with {name} slots filled. Dictionary text may carry markup; slot values are the caller's to escape. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const s = current.dict[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : s;
}

/** Counted strings: "<key>_one" / "<key>_other". {n} is the count. */
export function tn(key: string, n: number, vars?: Record<string, string | number>): string {
  const form = `${key}_${current.plural.select(n)}`;
  return t(current.dict[form] != null ? form : `${key}_other`, { n, ...vars });
}

/** The picker remembers the choice in a cookie, because the server has to know it before it renders. */
export function setLang(lang: string) {
  if (!LANGS.some(([code]) => code === lang) || typeof document === "undefined") return;
  document.cookie = `bp_lang=${lang}; path=/; max-age=31536000; samesite=lax`;
  const url = new URL(window.location.href);
  url.searchParams.delete("lang");
  window.location.href = url.toString();
}

const I18nContext = createContext({ lang: "en" });

export function I18nProvider({ lang, messages, children }: { lang: string; messages: Record<string, string>; children: ReactNode }) {
  bindI18n(lang, messages);
  return <I18nContext.Provider value={{ lang }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const { lang } = useContext(I18nContext);
  return { lang, t, tn, setLang };
}
