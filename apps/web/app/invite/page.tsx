import type { Metadata } from "next";
import { messagesFor, requestLang } from "@/lib/messages";
import { InvitePage } from "@/components/invite/invite-page";

export async function generateMetadata(): Promise<Metadata> {
  const messages = messagesFor(await requestLang());
  return { title: messages["title.invite"] };
}

export default function Page() {
  return <InvitePage />;
}
