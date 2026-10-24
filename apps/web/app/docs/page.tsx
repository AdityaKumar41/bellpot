import type { Metadata } from "next";
import { messagesFor, requestLang } from "@/lib/messages";
import { DocsPage } from "@/components/docs/docs-page";

export async function generateMetadata(): Promise<Metadata> {
  const messages = messagesFor(await requestLang());
  return { title: messages["title.docs"], description: messages["meta.docs"] };
}

export default function Page() {
  return <DocsPage />;
}
