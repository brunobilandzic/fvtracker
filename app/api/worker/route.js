import { getCurrentIdentity } from "@/lib/auth/fetchSessionData";
import { protectApi } from "@/lib/auth/protectApi";
import populateCommon, {
  cultivationPopulate,
  productionPopulate,
  warehousePopulate,
  financialPopulate,
} from "@/lib/workers/populate";
import { Worker } from "@/models/user/workers";

async function handleGET(request) {

  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("workerId");

    const user = await getCurrentIdentity();
    const payroll = user.isAdmin || ["FinancialManager", "GeneralManager"].includes(user.managerModelName);
    const filter = { _id: workerId };
    if (!payroll) {
      if (user.workerId) filter.appUser = user.appUserId;
      else filter.manager = user.rootManagerId;
    }
    const worker = await Worker.findOne(filter).populate(populateCommon);

    if (!worker) {
      return Response.json(
        { error: "Radnik nije pronađen", workerId },
        { status: 404 },
      );
    }

    switch (worker.__t) {
      case "CultivationWorker":
        await worker.populate(cultivationPopulate);
        break;
      case "ProductionWorker":
        await worker.populate(productionPopulate);
        break;
      case "WarehouseWorker":
        await worker.populate(warehousePopulate);
        break;
      case "FinancialWorker":
        await worker.populate(financialPopulate);
        break;
    }
    return Response.json({ worker });
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "CultivationManager", "ProductionManager", "FinancialManager", "WarehouseManager", "CultivationWorker", "ProductionWorker", "WarehouseWorker", "FinancialWorker"]);
