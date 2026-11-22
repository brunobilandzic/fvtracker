import { getScopedField, getScopedArea } from "@/lib/auth/recordScope";
import { protectApi } from "@/lib/auth/protectApi";
import cultivation from "@/lib/cultivation";

async function handleGET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const cultivationArea = await getScopedArea(id);
    if (!cultivationArea) return new Response(null, { status: 404 });
    return Response.json({ cultivationArea });
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

async function handlePOST(request) {
  try {
    const body = await request.json();

    if (!body.field || !await getScopedField({ _id: body.field })) return new Response(null, { status: 404 });
    const newCultivationArea = await cultivation.cultivationArea.create(body);
    return Response.json({ newCultivationArea }, { status: 201 });
  } catch {
    return Response.json(
      {
        error: "Request failed",
      },
      { status: 500 },
    );
  }
}

async function handlePUT(request) {
  try {
    const body = await request.json();
    if (!await getScopedArea(body.id)) return new Response(null, { status: 404 });
    const updated = await cultivation.cultivationArea.update(body);

    return Response.json({ updatedCultivationArea: updated }, { status: 200 });
  } catch {
    return Response.json(
      {
        error: "Request failed",
      },
      { status: 500 },
    );
  }
}

async function handleDELETE(request) {
  try {

    const body = await request.json();
    const { id } = body;
    if (!await getScopedArea(id)) return new Response(null, { status: 404 });
    const deleted = await cultivation.cultivationArea.delete(id);
    if (!deleted) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ success: true }, { status: 200 });
  } catch {
    return Response.json(
      {
        error: "Request failed",
      },
      { status: 500 },
    );
  }
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "CultivationManager", "CultivationWorker"]);
export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "CultivationManager"]);
export const PUT = protectApi(handlePUT, ["Admin", "GeneralManager", "CultivationManager"]);
export const DELETE = protectApi(handleDELETE, ["Admin", "GeneralManager", "CultivationManager"]);
