/** HTML-escape anything that did not originate in our own source. */
export const esc = (value: unknown) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export const isBase58 = (value: unknown) => typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,90}$/.test(value);

export const short = (pk: string) => {
  const s = String(pk);
  return s.slice(0, 4) + "…" + s.slice(-4);
};

export function tickerHue(symbol: string) {
  let hue = 0;
  for (const char of symbol) hue = (hue * 31 + char.charCodeAt(0)) % 360;
  return hue;
}
