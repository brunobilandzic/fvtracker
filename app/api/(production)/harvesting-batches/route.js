import { protectApi } from "@/lib/auth/protectApi";
import { fetchManager, isAuthorizedGeneralManager } from "@/lib/auth/fetchSessionData";
import { PRODUCTION_MANAGER } from "@/lib/constants/users/managerTypes";
import { getHarvestingBatches } from "@/lib/cultivation/harvest/batches";

async function handleGET() {
  try {
    const isGeneralManager = await isAuthorizedGeneralManager();
    if (isGeneralManager) {
      const harvestingBatches = await getHarvestingBatches({
        managerName: PRODUCTION_MANAGER,
      });
      return Response.json({ harvestingBatches }, { status: 200 });
    }

    const harvestingBatches = await getHarvestingBatches({
      managerName: PRODUCTION_MANAGER,
    });
    return Response.json({ harvestingBatches }, { status: 200 });
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "ProductionManager", "ProductionWorker", "FinancialManager", "CultivationManager"]);
