"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { LoadingProvider } from "@/lib/providers/custom";

export default function SiteLayout({ children, demoMode }) {
  const path = usePathname();
  const { data: session } = useSession();
  const publicDemoHome = demoMode && path === "/" && !session?.user;

  return (
    <>
      <Navbar publicDemoHome={publicDemoHome} />
      {demoMode && !publicDemoHome && (
        <p role="status" className="w-full px-4 py-2 text-center text-sm">
          Demonstracijski podaci. Promjene su onemogućene.
        </p>
      )}
      <div className={`mx-auto w-full max-w-6xl px-4 ${publicDemoHome ? "pt-6 pb-6 sm:pt-8" : "pt-10 pb-16"}`}>
        <LoadingProvider>{children}</LoadingProvider>
      </div>
    </>
  );
}
