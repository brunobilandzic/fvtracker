"use server";

import { redirect } from "next/navigation";
import { getServerSession, signIn } from "@/auth";
import { getDemoRole } from "@/lib/auth/demoRoles";
import { isDemoMode } from "@/lib/demoMode";

export async function signInDemo(_previousState, formData) {
  const unavailable = { error: "Prijava za ovu demo ulogu trenuta\u010dno nije dostupna." };
  if (!isDemoMode()) return unavailable;

  const role = getDemoRole(formData?.get?.("role"));
  if (!role) return unavailable;

  const password = process.env[role.passwordEnv];
  if (!password) return unavailable;

  const failed = { error: "Prijava u demo nije uspjela. Poku\u0161ajte ponovno." };
  try {
    if (await getServerSession()) {
      return { error: "Odjavite se prije odabira druge demo uloge." };
    }

    const result = await signIn("credentials", {
      login: role.username,
      password,
      demoRole: role.id,
      redirectTo: role.destination,
      redirect: false,
    });

    if (!result || new URL(result).pathname !== role.destination) {
      return failed;
    }
  } catch {
    return failed;
  }

  redirect(role.destination);
}
