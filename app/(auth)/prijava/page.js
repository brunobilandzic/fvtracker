import { registrationEnabled } from "@/lib/demoMode";
import LoginPageComponent from "@/components/auth/login";
import React from "react";

function LoginPage() {
  return (
    <div>
      <LoginPageComponent allowRegistration={registrationEnabled()} />
    </div>
  );
}

export default LoginPage;
