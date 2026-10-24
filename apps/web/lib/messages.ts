import { cookies, headers } from "next/headers";
import en from "@bellpot/i18n/en.json";
import es from "@bellpot/i18n/es.json";
import ja from "@bellpot/i18n/ja.json";
import ko from "@bellpot/i18n/ko.json";
import zhCN from "@bellpot/i18n/zh-CN.json";
import zhTW from "@bellpot/i18n/zh-TW.json";
import docsEn from "@bellpot/i18n/docs.en.json";
import docsEs from "@bellpot/i18n/docs.es.json";
import docsJa from "@bellpot/i18n/docs.ja.json";
import docsKo from "@bellpot/i18n/docs.ko.json";
import docsZhCN from "@bellpot/i18n/docs.zh-CN.json";
import docsZhTW from "@bellpot/i18n/docs.zh-TW.json";
import { resolveRequestLang } from "./lang";

const UI: Record<string, Record<string, string>> = {
  en: en as Record<string, string>,
  es: es as Record<string, string>,
  ja: ja as Record<string, string>,
  ko: ko as Record<string, string>,
  "zh-CN": zhCN as Record<string, string>,
  "zh-TW": zhTW as Record<string, string>,
};

const DOCS: Record<string, Record<string, string>> = {
  en: docsEn as Record<string, string>,
  es: docsEs as Record<string, string>,
  ja: docsJa as Record<string, string>,
  ko: docsKo as Record<string, string>,
  "zh-CN": docsZhCN as Record<string, string>,
  "zh-TW": docsZhTW as Record<string, string>,
};

/** UI strings plus the long docs page, English filled in under any missing key. */
export function messagesFor(lang: string): Record<string, string> {
  const ui = lang === "en" ? UI.en : { ...UI.en, ...(UI[lang] ?? {}) };
  const docs = lang === "en" ? DOCS.en : { ...DOCS.en, ...(DOCS[lang] ?? {}) };
  return { ...ui, ...docs };
}

export async function requestLang(): Promise<string> {
  const jar = await cookies();
  const headerList = await headers();
  return resolveRequestLang(jar.get("bp_lang")?.value, headerList.get("accept-language"));
}
