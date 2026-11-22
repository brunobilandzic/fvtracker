import { notFound } from "next/navigation";
import { registrationEnabled } from "@/lib/demoMode";
import SignUpPageComponent from "@/components/auth/signup";
import React from "react";

function SignupPage() {
  if (!registrationEnabled()) notFound();
  return (
    <div>
      <SignUpPageComponent />
    </div>
  );
}

export default SignupPage;
