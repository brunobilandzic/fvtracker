import { protectApi } from "@/lib/auth/protectApi";
import {
  getCurrentIdentity,
} from "@/lib/auth/fetchSessionData";
import { GENERAL_MANAGER, FINANCIAL_MANAGER, MANAGER_TYPES } from "@/lib/constants/users/managerTypes";
import { createWorker } from "@/lib/workers/create";
import { getWorkers } from "@/lib/workers/get";
import mongoose from "mongoose";

async function handleGET(req) {
  try {
    const user = await getCurrentIdentity();
    const workers = await getWorkers({
      rootManagerId: user.rootManagerId,
      managerModelName: user.managerModelName,
    });
    return Response.json({ workers });
  } catch {
    return Response.json(
      { error: "Greška pri dohvaćanju radnika" },
      { status: 500 },
    );
  }
}

async function handlePOST(req) {
  try {
    const user = await getCurrentIdentity();
    const { workerData } = await req.json();
    const sector = workerData?.managerModelName;
    if (!MANAGER_TYPES.includes(sector) || [GENERAL_MANAGER, "Worker"].includes(sector)) {
      return Response.json({ error: "Invalid worker sector" }, { status: 400 });
    }
    const isGeneralAdmin = user.isAdmin || user.managerModelName === GENERAL_MANAGER;
    if (!isGeneralAdmin && sector !== user.managerModelName) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }
    const manager = isGeneralAdmin ? await mongoose.models[sector].findOne().select("rootManager") : null;
    const rootManagerId = isGeneralAdmin ? manager?.rootManager : user.rootManagerId;
    if (!rootManagerId) return new Response(null, { status: 404 });
    const { specificWorker } = await createWorker({ rootManagerId, workerData, isGeneralAdmin });
    return Response.json({ worker: specificWorker });
  } catch {
    return Response.json(
      { error: "Greška pri kreiranju radnika" },
      { status: 500 },
    );
  }
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "CultivationManager", "ProductionManager", "FinancialManager", "WarehouseManager"]);
export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "CultivationManager", "ProductionManager", "FinancialManager", "WarehouseManager"]);
