import { protectApi } from "@/lib/auth/protectApi";
import { fetchManager } from "@/lib/auth/fetchSessionData";
import {
  CULTIVATION_MANAGER,
  PRODUCTION_MANAGER,
} from "@/lib/constants/users/managerTypes";
import {
  getHarvestingBatches,
  populateBatches,
} from "@/lib/cultivation/harvest/batches";
import { HarvestingBatch } from "@/models/sectors/interface/HarvestingBatch";

async function handleGET(req) {
  try {
    const { specificManager, generalManager, isAdmin } = await fetchManager({
      managerNames: [CULTIVATION_MANAGER, PRODUCTION_MANAGER],
    });

    if (generalManager || isAdmin) {
      let harvestingBatches = await HarvestingBatch.find();
      harvestingBatches = await populateBatches({ harvestingBatches });
      return Response.json({ harvestingBatches }, { status: 200 });
    }
    // manager of intest is first in array
    const harvestingBatches = await getHarvestingBatches({
      managerName: specificManager.rootManager.managerModelName,
    });
    return Response.json({ harvestingBatches }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Failed to fetch harvesting batches" },
      { status: 500 },
    );
  }
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "CultivationManager", "ProductionManager"]);
