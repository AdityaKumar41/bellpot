import type { Metadata } from "next";
import { Suspense } from "react";
import { messagesFor, requestLang } from "@/lib/messages";
import { LeaderboardPage } from "@/components/leaderboard/leaderboard-page";

export async function generateMetadata(): Promise<Metadata> {
  const messages = messagesFor(await requestLang());
  return { title: messages["title.leaderboard"] };
}

export default function Page() {
  return (
    <Suspense fallback={<p className="note">Loading…</p>}>
      <LeaderboardPage />
    </Suspense>
  );
}
