import type { Metadata } from "next";
import { messagesFor, requestLang } from "@/lib/messages";
import { PortfolioPage } from "@/components/portfolio/portfolio-page";

export async function generateMetadata(): Promise<Metadata> {
  const messages = messagesFor(await requestLang());
  return { title: messages["title.portfolio"] };
}

export default function Page() {
  return <PortfolioPage />;
}
