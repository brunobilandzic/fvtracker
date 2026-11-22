"use client";

import { useSession } from "next-auth/react";
import ProfileComponent from "@/components/auth/profile";
import Link from "next/link";
import { FiShield } from "react-icons/fi";
import DemoRoleCards from "./demoRoleCards";

export default function Home({ demoRoles }) {
  const { data: session } = useSession();
  if (session?.user) return <ProfileComponent user={session.user} />;

  const demo = demoRoles.length > 0;

  return (
    <>
      <main>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">FVTracker</h1>
            <p className="mt-3 text-lg font-medium leading-snug tracking-tight sm:text-xl">
              Sustav za upravljanje poljoprivrednom proizvodnjom
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
              Interaktivna demonstracija diplomskog rada.
            </p>
          </div>
          {demo && (
            <p className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2 py-1.5 text-xs font-medium leading-snug text-green-800 sm:gap-2 sm:px-3">
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
      <footer className="mt-8 border-t border-gray-200 pt-4 text-center text-xs leading-relaxed text-gray-600 sm:mt-10">
        <p>
          FVTracker · Diplomski rad · <span className="whitespace-nowrap">Bruno Bilandžić</span>{" "}<span className="whitespace-nowrap">· OSS Split</span>
        </p>
      </footer>
    </>
  );
}
