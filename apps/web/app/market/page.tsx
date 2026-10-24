import type { Metadata } from "next";
import { Suspense } from "react";
import { messagesFor, requestLang } from "@/lib/messages";
import { MarketPage } from "@/components/market/market-page";

export async function generateMetadata(): Promise<Metadata> {
  const messages = messagesFor(await requestLang());
  return { title: messages["title.market"] };
}

export default function Page() {
  return (
    <Suspense fallback={<p className="note">Loading…</p>}>
      <MarketPage />
    </Suspense>
  );
}
