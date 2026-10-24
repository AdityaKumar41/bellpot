import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { messagesFor, requestLang } from "@/lib/messages";
import { WalletProvider } from "@/components/wallet/wallet-provider";
import "./globals.css";

export const viewport: Viewport = { themeColor: "#e8eaef", width: "device-width", initialScale: 1 };

export async function generateMetadata(): Promise<Metadata> {
  const messages = messagesFor(await requestLang());
  return {
    title: messages["title.index"],
    description: messages["meta.index"],
    icons: { icon: "/favicon.svg" },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await requestLang();
  const messages = messagesFor(lang);
  return (
    <html lang={lang}>
      <body>
        <I18nProvider lang={lang} messages={messages}>
          <WalletProvider>{children}</WalletProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
