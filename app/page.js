"use client";

import { useSession } from "next-auth/react";
import ProfileComponent from "@/components/auth/profile";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();
  if (session?.user) return <ProfileComponent user={session.user} />;

  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <h1 className="text-4xl font-bold mb-4">Dobrodošli u FvTracker</h1>
      <p className="text-lg text-gray-600 mb-8">
        Sustav za upravljanje uzgojom i prodajom voća i povrća. Ako imate ulogu
        u sustavu, prijavite se za pristup svom sektoru ili se registrirajte i zatražite ulogu. <br/>Ako ste kupac,
        pregledajte našu ponudu i naručite proizvode.
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
  );
}
