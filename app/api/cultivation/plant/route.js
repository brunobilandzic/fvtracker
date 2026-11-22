import { protectApi } from "@/lib/auth/protectApi";
import { cropsData, getCropVarietyById } from "@/lib/cultivation/plants";

export const GET = protectApi(async (request) => {
  const id = request.nextUrl.searchParams.get("id");
  if (id) return Response.json({ cropVariety: await getCropVarietyById(id) });
  return Response.json(await cropsData());
}, ["Admin", "GeneralManager", "CultivationManager", "CultivationWorker", "ProductionManager", "ProductionWorker", "FinancialManager"]);
