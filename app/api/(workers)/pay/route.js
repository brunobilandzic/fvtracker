import { protectApi } from "@/lib/auth/protectApi";
import { getCurrentIdentity } from "@/lib/auth/fetchSessionData";
import { Worker } from "@/models/user/workers";
import basePopulate, {
  cultivationPopulate,
  financialPopulate,
  productionPopulate,
  warehousePopulate,
} from "@/lib/workers/populate";
import {
  CULTIVATION_MANAGER,
  FINANCIAL_MANAGER,
  PRODUCTION_MANAGER,
  WAREHOUSE_MANAGER,
} from "@/lib/constants/users/managerTypes";

async function handlePOST(req) {
  try {
    const user = await getCurrentIdentity();
    const { workerId, amount } = await req.json();
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return Response.json({ error: "Invalid payment amount" }, { status: 400 });
    }
    const payroll = user.isAdmin || ["FinancialManager", "GeneralManager"].includes(user.managerModelName);
    const worker = await Worker.findOneAndUpdate(
      { _id: workerId, ...(!payroll && { manager: user.rootManagerId }) },
      { $inc: { payedAmount: amount } },
      { new: true },
    );
    if (!worker) return new Response(null, { status: 404 });
    await worker.populate(basePopulate);
    let populate;
    switch (worker.manager.managerModelName) {
      case CULTIVATION_MANAGER:
        populate = cultivationPopulate;
        break;
      case PRODUCTION_MANAGER:
        populate = productionPopulate;
        break;
      case WAREHOUSE_MANAGER:
        populate = warehousePopulate;
        break;
      case FINANCIAL_MANAGER:
        populate = financialPopulate;
        break;
      default:
        throw new Error(
          `Unknown worker type: ${worker.manager.managerModelName}`,
        );
    }
    await worker.populate(populate);

    return Response.json(
      { message: `Radnik ${workerId} isplaćen za iznos ${amount}.`, worker },
      { status: 200 },
    );
  } catch {
    return Response.json(
      { message: "Došlo je do greške pri obradi zahtjeva za isplatu." },
      { status: 500 },
    );
  }
}

export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "CultivationManager", "ProductionManager", "FinancialManager", "WarehouseManager"]);
