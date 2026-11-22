"use client";

import { LoginButton, LogoutButton } from "@/components/auth/login";
import React from "react";
import { SignUpButton } from "@/components/auth/signup";
import { useSession } from "next-auth/react";

function AuthorizePage({ allowRegistration }) {
  const { data: session } = useSession();

  return (
    <div className="h-screen flex justify-center items-center">
      <div>
        {session?.user ? (
          <div>
            <h2 className="text-2xl mb-4 m-x-auto">
              Prijavljeni ste kao{" "}
              <div className="break-words text-wrap row">
                {session.user.displayName}
              </div>
            </h2>

            <p>Dobrodošli natrag! Uspješno ste autorizirani.</p>
            <LogoutButton />
          </div>
        ) : (
          <div className="flex gap-2">
            <LoginButton />
            {allowRegistration && <SignUpButton />}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthorizePage;
