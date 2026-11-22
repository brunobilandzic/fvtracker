import { getCurrentIdentity } from "@/lib/auth/fetchSessionData";
import { getAssignableWorker } from "@/lib/auth/recordScope";
import { protectApi } from "@/lib/auth/protectApi";
import { fetchManager, fetchManagerWorker } from "@/lib/auth/fetchSessionData";
import {
  FINANCIAL_MANAGER,
  WAREHOUSE_MANAGER,
} from "@/lib/constants/users/managerTypes";
import { managerMorkerMap } from "@/lib/constants/users/managerWorker";
import {
  createWarehouseRequest,
  getWarehouseRequests,
} from "@/lib/warehouses/warehouseRequests";
import { FinancialManager } from "@/models/user/managers/FinancialManager";
import { WarehouseManager } from "@/models/user/managers/WarehouseManager";

async function handleGET(request) {
  try {
    let { specificManager, worker, unauthorized } = await fetchManagerWorker({
      managerNames: [WAREHOUSE_MANAGER, FINANCIAL_MANAGER],
      workerType: (await getCurrentIdentity()).workerType,
    });

    if (unauthorized) {
      return Response.json(
        { message: "Nemate pravo izrade otpremnica" },
        { status: 403 },
      );
    }

    const { financialManagerId, warehouseManagerId } = await extractManagerIds(specificManager, worker);

    const user = await getCurrentIdentity();
    if (!user.isAdmin && user.managerModelName !== "GeneralManager" && !financialManagerId && !warehouseManagerId) {
      return Response.json({ warehouseRequests: [] });
    }
    const warehouseRequests = await getWarehouseRequests({
      financialManagerId,
      warehouseManagerId,
    });
    return Response.json({ warehouseRequests });
  } catch {
    return new Response(
      JSON.stringify({
        message: "Greška prilikom dohvaćanja zahtjeva skladištu.",
      }),
      { status: 500 },
    );
  }
}
async function extractManagerIds(specificManager, worker) {
  let warehouseManagerId =
    specificManager?.rootManager.managerModelName === WAREHOUSE_MANAGER
      ? specificManager._id
      : null;
  let financialManagerId =
    specificManager?.rootManager.managerModelName === FINANCIAL_MANAGER
      ? specificManager._id
      : null;

  if (worker && worker.manager) {
    if (worker.manager.managerModelName === WAREHOUSE_MANAGER) {
      const warehouseManager = await WarehouseManager.findOne({
        rootManager: worker.manager._id,
      }).select("_id");
      warehouseManagerId = warehouseManager._id;
    } else if (worker.manager.managerModelName === FINANCIAL_MANAGER) {
      const financialManager = await FinancialManager.findOne({
        rootManager: worker.manager._id,
      }).select("_id");
      financialManagerId = financialManager._id;
    }
  }
  return { financialManagerId, warehouseManagerId };
}

async function handlePOST(request) {
  try {
    let {
      specificManager: financialManager,
      worker,
      unauthorized,
    } = await fetchManagerWorker({
      managerNames: [FINANCIAL_MANAGER],
      workerType: managerMorkerMap[FINANCIAL_MANAGER],
    });
    if (unauthorized) {
      return Response.json(
        { message: "Nemate pravo pristupa" },
        { status: 403 },
      );
    }

    const requestData = await request.json();
    const { financialManagerId } = await extractManagerIds(
      financialManager,
      worker,
    );
    const assignee = await getAssignableWorker(requestData.workerId, "FinancialWorker");
    if (!assignee) return new Response(null, { status: 404 });
    const managerId = financialManagerId || (await FinancialManager.findOne({ rootManager: assignee.manager }).select("_id"))?._id;
    if (!managerId) return new Response(null, { status: 404 });
    requestData.financialManager = managerId;
    const warehouseRequest = await createWarehouseRequest(requestData);
    return Response.json({
      warehouseRequest,
      message: "Zahtjev uspješno poslan skladištu.",
    });
  } catch {
    return Response.json(
      { message: "Greška prilikom izrade zahtjeva skladištu." },
      { status: 500 },
    );
  }
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "WarehouseManager", "FinancialManager", "WarehouseWorker", "FinancialWorker"]);
export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "FinancialManager", "FinancialWorker"]);
