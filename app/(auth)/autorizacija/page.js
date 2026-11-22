import Authorize from "@/components/auth/authorize";
import { registrationEnabled } from "@/lib/demoMode";

export default function AuthorizePage() {
  return <Authorize allowRegistration={registrationEnabled()} />;
}
