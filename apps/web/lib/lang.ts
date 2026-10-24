import langs from "@bellpot/i18n/langs.json";

/** Picker order: code, native name. */
export const LANGS = langs as [string, string][];
const CODES = LANGS.map(([code]) => code);

/** Accept-Language tag → one of ours. Chinese goes by script/region. */
export function matchLang(tag: string | null | undefined): string | null {
  const t = String(tag ?? "").trim().toLowerCase();
  if (!t) return null;
  const exact = CODES.find((l) => l.toLowerCase() === t);
  if (exact) return exact;
  if (t === "zh" || t.startsWith("zh-")) return /-(tw|hk|mo|hant)\b/.test(t) ? "zh-TW" : "zh-CN";
  return CODES.find((l) => l.toLowerCase() === t.split("-")[0]) ?? null;
}

/** Cookie, then Accept-Language, then English. `?lang=` is applied by middleware before render. */
export function resolveRequestLang(cookie: string | undefined, acceptLanguage: string | null): string {
  const fromCookie = matchLang(cookie ?? "");
  if (fromCookie) return fromCookie;
  const prefs = String(acceptLanguage ?? "")
    .slice(0, 400)
    .split(",")
    .map((part) => {
      const [tag, q] = part.split(";q=");
      return { tag, q: q == null ? 1 : Number(q) || 0 };
    })
    .sort((a, b) => b.q - a.q);
  for (const pref of prefs) {
    const lang = matchLang(pref.tag);
    if (lang) return lang;
  }
  return "en";
}
