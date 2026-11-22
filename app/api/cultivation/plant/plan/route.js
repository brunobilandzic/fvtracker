import { getScopedField } from "@/lib/auth/recordScope";
import { protectApi } from "@/lib/auth/protectApi";
import cultivation from "@/lib/cultivation";
import { populatePlans } from "@/lib/cultivation/plans";

async function handlePOST(request) {
  try {
    const body = await request.json();
    if (!body.field || !await getScopedField({ _id: body.field })) return new Response(null, { status: 404 });
    const newPlantingPlan = await cultivation.plans.createPlantingPlan({
      plantingPlanData: body,
    });
    await populatePlans({ plans: [newPlantingPlan] });
    return Response.json({ newPlantingPlan }, { status: 201 });
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

async function handleDELETE(request) {
  try {

    const { planId } = await request.json();
    if (!planId) return new Response(null, { status: 400 });
    const field = await getScopedField({ plantingPlans: planId });
    if (!field) return new Response(null, { status: 404 });
    const fieldId = field._id;
    await cultivation.plans.deletePlantingPlans({ fieldId, planId });
    return Response.json(
      { message: "Planting plans deleted" },
      { status: 200 },
    );
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "CultivationManager"]);
export const DELETE = protectApi(handleDELETE, ["Admin", "GeneralManager", "CultivationManager"]);
