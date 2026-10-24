import { NextResponse, type NextRequest } from "next/server";
import { matchLang } from "./lib/lang";

/** A shared `?lang=` link sets the cookie and drops the query, so later pages stay in that language. */
export function middleware(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("lang");
  if (raw == null) return NextResponse.next();
  const lang = matchLang(raw);
  const url = request.nextUrl.clone();
  url.searchParams.delete("lang");
  const response = NextResponse.redirect(url);
  if (lang) response.cookies.set("bp_lang", lang, { path: "/", maxAge: 31536000, sameSite: "lax" });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon|demo).*)"],
};
