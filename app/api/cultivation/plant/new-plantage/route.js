import { getScopedCultivation, getAssignableWorker, getScopedField } from "@/lib/auth/recordScope";
import { protectApi } from "@/lib/auth/protectApi";
import {
  fetchManagerWorker,
  fetchSessionSpecificManager,
} from "@/lib/auth/fetchSessionData";
import { CULTIVATION_MANAGER } from "@/lib/constants/users/managerTypes";
import { managerMorkerMap } from "@/lib/constants/users/managerWorker";
import cultivation from "@/lib/cultivation";

async function handlePOST(request) {
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
    const body = await request.json();
    const record = await getScopedCultivation(body.cultivationId);
    const assignee = await getAssignableWorker(body.workerId, "CultivationWorker");
    if (!record || !assignee) return new Response(null, { status: 404 });
    await record.populate({ path: "cultivationArea", select: "field" });
    const planFilter = { plantingPlans: body.plantingPlanId };
    if (!await getScopedField({ _id: record.cultivationArea.field, ...planFilter })) return new Response(null, { status: 404 });
    const { plantedCropVarieties: newPlantage, plantageWork } =
      await cultivation.plants.create(body);
    return Response.json({ newPlantage, plantageWork }, { status: 200 });
  } catch {
    return Response.json(
      { success: false, error: "Request failed" },
      { status: 500 },
    );
  }
}

export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "CultivationManager", "CultivationWorker"]);
