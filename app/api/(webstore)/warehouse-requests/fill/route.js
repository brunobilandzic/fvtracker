import { getAssignableWorker } from "@/lib/auth/recordScope";
import { protectApi } from "@/lib/auth/protectApi";
import { fetchManager, fetchManagerWorker } from "@/lib/auth/fetchSessionData";
import { WAREHOUSE_MANAGER } from "@/lib/constants/users/managerTypes";
import { fillWarehouseRequest } from "@/lib/warehouses/warehouseRequests";
import { managerMorkerMap } from "@/lib/constants/users/managerWorker";

async function handlePOST(request) {
  try {
    let {
      specificManager,
      worker: warehouseWorker,
      unauthorized,
    } = await fetchManagerWorker({
      managerNames: [WAREHOUSE_MANAGER],
      workerType: managerMorkerMap[WAREHOUSE_MANAGER],
    });

    if (unauthorized) {
      return Response.json(
        { message: "Nemate pravo izrade otpremnica" },
        { status: 403 },
      );
    }
    const { warehouseRequestId, shipmentSources, workerId } =
      await request.json();
    const worker = await getAssignableWorker(workerId, "WarehouseWorker");
    if (!worker) return new Response(null, { status: 404 });
    const result = await fillWarehouseRequest({
      workerManager: worker.manager,
      warehouseRequestId,
      shipmentSources,
      workerId,
    });
    return Response.json({ ...result });
  } catch {
    return Response.json(
      { message: "Error filling warehouse request" },
      { status: 500 },
    );
  }
}

export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "WarehouseManager", "WarehouseWorker"]);
