// The site's dictionaries: the single source for the browser bundle (apps/web/src/i18n.ts) and the server's
// server-rendered pages (apps/server/src/i18n/catalog.ts). Adding a language = one <lang>.json + docs.<lang>.json here
// and a row in langs.json.
export const dictDir = new URL(".", import.meta.url).pathname;
export { default as LANGS } from "./langs.json" with { type: "json" };
