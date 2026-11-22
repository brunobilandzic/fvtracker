import { protectApi } from "@/lib/auth/protectApi";
import { fetchManagerWorker } from "@/lib/auth/fetchSessionData";
import {
  FINANCIAL_MANAGER,
  PRODUCTION_MANAGER,
} from "@/lib/constants/users/managerTypes";
import { managerMorkerMap } from "@/lib/constants/users/managerWorker";
import { ProductionManager } from "@/models/user/managers/ProductionManager";
import { populateProductsConfig } from "../populate";

// here is the place we fetch all production data

async function handleGET() {
  let {
    specificManager,
    worker: productionWorker,
    generalManager,
    isAdmin,
    unauthorized,
  } = await fetchManagerWorker({
    managerNames: [PRODUCTION_MANAGER, FINANCIAL_MANAGER],
    workerType: managerMorkerMap[PRODUCTION_MANAGER],
  });

  if (unauthorized) {
    return Response.json({ unauthorized: true }, { status: 403 });
  }
  if (
    generalManager || isAdmin ||
    specificManager?.rootManager.managerModelName === FINANCIAL_MANAGER
  ) {
    const productionManagers = await ProductionManager.find().populate(
      populateProductsConfig,
    );
    return Response.json({ productionManagers }, { status: 200 });
  }
  const filter = specificManager ? { _id: specificManager._id } : { rootManager: productionWorker.manager._id };
  const productionManager = await ProductionManager.findOne(filter).populate(populateProductsConfig);

  return Response.json({ productionManager }, { status: 200 });
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "ProductionManager", "FinancialManager", "ProductionWorker"]);
