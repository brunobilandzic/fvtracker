"use client";

import { useSession } from "next-auth/react";
import ProfileComponent from "@/components/auth/profile";
import Link from "next/link";
import DemoRoleCards from "./demoRoleCards";

export default function Home({ demoRoles }) {
  const { data: session } = useSession();
  if (session?.user) return <ProfileComponent user={session.user} />;

  const hasDemoRoles = demoRoles.length > 0;

  return (
    <>
      <div className="max-w-2xl mx-auto text-center py-12 sm:py-16">
        <h1 className="text-4xl font-bold mb-4">Dobrodošli u FvTracker</h1>
        <p className="text-lg text-gray-600 mb-8">
          Sustav za upravljanje uzgojom i prodajom voća i povrća.{" "}
          {hasDemoRoles
            ? "Istražite sustav u jednoj od demo uloga ili pregledajte ponudu proizvoda."
            : "Prijavite se za pristup svom sektoru ili se registrirajte i zatražite ulogu. Ako ste kupac, pregledajte ponudu i naručite proizvode."}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/autorizacija" className="btn submitButton">
            Prijava
          </Link>
          <Link href="/trgovina" className="btn">
            Pregledaj proizvode
          </Link>
        </div>
      </div>
      {hasDemoRoles && <DemoRoleCards roles={demoRoles} />}
    </>
  );
}
