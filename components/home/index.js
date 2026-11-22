"use client";

import { useSession } from "next-auth/react";
import ProfileComponent from "@/components/auth/profile";
import Link from "next/link";
import { FiArrowUpRight, FiShield } from "react-icons/fi";
import { LuSprout } from "react-icons/lu";
import DemoRoleCards from "./demoRoleCards";

const contentWidth = "mx-auto w-full max-w-6xl px-4 sm:px-8";
const navItem = "inline-flex min-h-10 items-center whitespace-nowrap rounded-md px-1.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:px-3 sm:text-sm";

function DemoNavigation() {
  return (
    <header className="border-b border-[#e0e8de] bg-white">
      <nav aria-label="Glavna navigacija" className={`${contentWidth} flex min-h-14 items-center justify-between gap-2 py-1`}>
        <Link href="/" aria-current="page" className="inline-flex items-center gap-2 rounded-lg text-sm font-bold tracking-tight text-[#18372a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          <span className="grid size-8 place-items-center rounded-lg bg-[#174b37] text-white">
            <LuSprout aria-hidden="true" size={16} />
          </span>
          FVTracker
        </Link>
        <div className="flex flex-wrap justify-end gap-x-1">
          <Link href="/trgovina" className={`${navItem} gap-1`}>
            Proizvodi <FiArrowUpRight aria-hidden="true" size={13} />
          </Link>
          <Link href="/autorizacija" className={navItem}>Ručna prijava</Link>
        </div>
      </nav>
    </header>
  );
}

export default function Home({ demoRoles }) {
  const { data: session } = useSession();
  if (session?.user) return <ProfileComponent user={session.user} />;

  const demo = demoRoles.length > 0;

  return (
    <div className={`[font-family:var(--font-geist-sans)] text-[#172c22] ${demo ? "min-h-screen bg-[#f6f8f4]" : ""}`}>
      {demo && <DemoNavigation />}
      <main className={`${contentWidth} pt-6 sm:pt-9`}>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <h1 className="text-4xl font-semibold leading-none tracking-[-0.045em] sm:text-5xl">FVTracker</h1>
            <p className="mt-3 text-lg font-medium leading-snug tracking-tight sm:text-xl">
              Sustav za upravljanje poljoprivrednom proizvodnjom
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Interaktivna demonstracija diplomskog rada.
            </p>
          </div>
          {demo && (
            <p className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#d6e5d9] bg-[#eaf3eb] px-2 py-1.5 text-xs font-medium leading-snug text-[#24533c] sm:gap-2 sm:px-3">
              <FiShield aria-hidden="true" className="shrink-0" size={14} />
              Demo način rada · Promjene nisu dopuštene
            </p>
          )}
        </div>
        {demo ? (
          <DemoRoleCards roles={demoRoles} />
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/autorizacija" className="btn submitButton">Prijava</Link>
            <Link href="/trgovina" className="btn">Pregledaj proizvode</Link>
          </div>
        )}
      </main>
      <footer className={`${contentWidth} mt-8 pb-5 text-slate-600 sm:mt-10 sm:pb-6`}>
        <p className="border-t border-[#dce5db] pt-4 text-center text-xs leading-relaxed">
          FVTracker · Diplomski rad · <span className="whitespace-nowrap">Bruno Bilandžić</span>{" "}<span className="whitespace-nowrap">· OSS Split</span>
        </p>
      </footer>
    </div>
  );
}
