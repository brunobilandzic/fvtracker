import { isDemoMode } from "@/lib/demoMode";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Providers from "./providers";
import { Navbar } from "@/components/layout/navbar";
import { LoadingProvider } from "@/lib/providers/custom";

export const metadata = {
  title: "FV Tracker",
  description: "Aplikacija za praćenje poljoprivredne proizvodnje",
};

export default function RootLayout({ children }) {
  const demoMode = isDemoMode();
  return (
    <html lang="hr" suppressHydrationWarning={true}>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased pb-6`}
      >
        <Providers demoMode={demoMode}>
          <Navbar />
          {demoMode && (
            <p role="status" className="w-full px-4 py-2 text-center text-sm">
              Demonstracijski podaci. Promjene su onemogućene.
            </p>
          )}
          <div className="w-full max-w-6xl mx-auto px-4 py-10">
            <LoadingProvider>{children}</LoadingProvider>{" "}
          </div>
        </Providers>
      </body>
    </html>
  );
}
