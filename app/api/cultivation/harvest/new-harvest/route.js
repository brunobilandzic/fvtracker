import { getScopedCultivation, getAssignableWorker, getScopedField } from "@/lib/auth/recordScope";
import { protectApi } from "@/lib/auth/protectApi";
import { fetchManagerWorker } from "@/lib/auth/fetchSessionData";
import { CULTIVATION_MANAGER } from "@/lib/constants/users/managerTypes";
import { managerMorkerMap } from "@/lib/constants/users/managerWorker";
import { harvestCells } from "@/lib/cultivation/harvest";

async function handlePOST(req) {
  try {
    const {
      specificManager: cultvationManager,
      worker,
      unauthorized,
    } = await fetchManagerWorker({
      managerNames: [CULTIVATION_MANAGER],
      workerType: managerMorkerMap[CULTIVATION_MANAGER],
    });
    if (unauthorized) {
      return Response.json(
        { success: false, error: "Nemate pravo izrade novog zasada" },
        { status: 403 },
      );
    }
    const body = await req.json();
    const record = await getScopedCultivation(body.cultivationId);
    const assignee = await getAssignableWorker(body.workerId, "CultivationWorker");
    if (!record || !assignee) return new Response(null, { status: 404 });
    await record.populate({ path: "cultivationArea", select: "field" });
    const planFilter = { harvestingPlans: body.harvestingPlanId };
    if (!await getScopedField({ _id: record.cultivationArea.field, ...planFilter })) return new Response(null, { status: 404 });
    const newHarvest = body;
    const { harvestWork, harvestedCropVarieties } =
      await harvestCells(newHarvest);
    return Response.json(
      { harvestWork, harvestedCropVarieties },
      { status: 201 },
    );
  } catch {
    return Response.json(
      { message: "Error creating new harvest" },
      { status: 500 },
    );
  }
}

export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "CultivationManager", "CultivationWorker"]);
