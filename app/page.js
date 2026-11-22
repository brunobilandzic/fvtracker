import Home from "@/components/home";
import { getDemoCards } from "@/lib/auth/demoRoles";
import { isDemoMode } from "@/lib/demoMode";

export default function HomePage() {
  return <Home demoRoles={isDemoMode() ? getDemoCards() : []} />;
}
