import { getScopedArea, getScopedCultivation } from "@/lib/auth/recordScope";
import { protectApi } from "@/lib/auth/protectApi";
import cultivation from "@/lib/cultivation";

async function handlePOST(request) {
  try {
    const body = await request.json();
    if (!await getScopedArea(body.data?.cultivationAreaId)) return new Response(null, { status: 404 });
    const newCultivation = await cultivation.cultivations.create(body.data);

    return Response.json({ newCultivation }, { status: 200 });
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

async function handlePUT(request) {
  try {
    const body = await request.json();
    if (!await getScopedCultivation(body._id)) return new Response(null, { status: 404 });
    const updatedCultivation = await cultivation.cultivations.update(body);
    return Response.json({ updatedCultivation }, { status: 200 });
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

async function handleDELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!await getScopedCultivation(id)) return new Response(null, { status: 404 });
    const deleted = await cultivation.cultivations.delete(id);
    if (!deleted) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ success: true }, { status: 200 });
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "CultivationManager"]);
export const PUT = protectApi(handlePUT, ["Admin", "GeneralManager", "CultivationManager"]);
export const DELETE = protectApi(handleDELETE, ["Admin", "GeneralManager", "CultivationManager"]);
