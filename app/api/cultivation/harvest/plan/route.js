import { getScopedField } from "@/lib/auth/recordScope";
import { protectApi } from "@/lib/auth/protectApi";
import cultivation from "@/lib/cultivation";

async function handlePOST(request) {
  try {
    const body = await request.json();
    if (!body.field || !await getScopedField({ _id: body.field })) return new Response(null, { status: 404 });
    const newHarvestingPlan = await cultivation.plans.createHarvestingPlan({
      harvestingPlanData: body,
    });
    await newHarvestingPlan.populate([
      {
        path: "items",
        populate: [
          {
            path: "cropVariety",
            populate: {
              path: "cropType",
            },
          },
          {
            path: "plantedCropVarieties",
            populate: {
              path: "cultivation",
              select: "name",
            },
          },
        ],
      },
      {
        path: "field",
        select: "name _id",
      },
      {
        path: "harvestingBatch",
        populate: [
          {
            path: "harvestingBatchItems",
            populate: {
              path: "cropVariety",
            },
          },
        ],
      },
    ]);
    return Response.json({ newHarvestingPlan }, { status: 201 });
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

async function handleDELETE(request) {
  try {

    const { planId } = await request.json();
    if (!planId) return new Response(null, { status: 400 });
    const field = await getScopedField({ harvestingPlans: planId });
    if (!field) return new Response(null, { status: 404 });
    const fieldId = field._id;
    await cultivation.plans.deleteHarvestingPlans({ fieldId, planId });
    return Response.json(
      { message: "Harvesting plans deleted" },
      { status: 200 },
    );
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "CultivationManager"]);
export const DELETE = protectApi(handleDELETE, ["Admin", "GeneralManager", "CultivationManager"]);
