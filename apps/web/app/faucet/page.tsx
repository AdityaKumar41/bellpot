import type { Metadata } from "next";
import { messagesFor, requestLang } from "@/lib/messages";
import { FaucetPage } from "@/components/faucet/faucet-page";

export async function generateMetadata(): Promise<Metadata> {
  const messages = messagesFor(await requestLang());
  return { title: messages["title.faucet"] };
}

export default function Page() {
  return <FaucetPage />;
}
