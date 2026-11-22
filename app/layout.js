import { getServerSession } from "@/auth";
import { isDemoMode } from "@/lib/demoMode";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Providers from "./providers";
import SiteLayout from "@/components/layout/siteLayout";

export const metadata = {
  title: "FV Tracker",
  description: "Aplikacija za praćenje poljoprivredne proizvodnje",
};

export default async function RootLayout({ children }) {
  const session = await getServerSession();
  const demoMode = isDemoMode();
  return (
    <html lang="hr" suppressHydrationWarning={true}>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <Providers demoMode={demoMode} session={session}>
          <SiteLayout demoMode={demoMode}>{children}</SiteLayout>
        </Providers>
      </body>
    </html>
  );
}
