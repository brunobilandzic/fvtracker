import { notFound } from "next/navigation";
import { fetchAdmin } from "@/lib/auth/fetchSessionData";
import { GeneralManagerRequestsComponent } from "@/components/auth/genmanreq";

export default async function GeneralManagerRequestsPage() {
  const { unauthorized } = await fetchAdmin();
  if (unauthorized) notFound();
  return <GeneralManagerRequestsComponent />;
}
