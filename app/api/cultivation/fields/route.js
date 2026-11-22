import { getScopedField } from "@/lib/auth/recordScope";
import { protectApi } from "@/lib/auth/protectApi";
import cultivation from "@/lib/cultivation";
import { ROLE_STATUSES } from "@/lib/constants/users";
import { fetchManager, fetchManagerWorker } from "@/lib/auth/fetchSessionData";
import { CULTIVATION_MANAGER } from "@/lib/constants/users/managerTypes";
import { managerMorkerMap } from "@/lib/constants/users/managerWorker";
import { CultivationManager } from "@/models/user/managers/CultivationManager";
import { Field } from "@/models/sectors/cultivation/Field";
import fieldsPopulate from "./populate";

async function handleGET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    let { specificManager: cultivationManager, worker: cultivationWorker, generalManager, isAdmin } =
      await fetchManagerWorker({
        managerNames: [CULTIVATION_MANAGER],
        workerType: managerMorkerMap[CULTIVATION_MANAGER],
      });
    if (isAdmin || generalManager) {
      const fieldFilter = slug ? { slug } : {};
      const fields = await Field.find(fieldFilter).populate(fieldsPopulate);
      if (!slug) return Response.json({ fields });
      if (!fields.length) return new Response(null, { status: 404 });
      return Response.json({ field: fields[0] });
    }
    if (cultivationWorker) {
      await cultivationWorker.populate({
        path: "manager",
        select: "managerModelName",
      });
      if (cultivationWorker.manager?.managerModelName !== CULTIVATION_MANAGER) {
        return Response.json(
          { message: "Unauthorized: Worker is not a cultivation worker" },
          { status: 403 },
        );
      }
      cultivationManager = await CultivationManager.findOne({
        rootManager: cultivationWorker.manager._id.toString(),
      });
    }

    if (!cultivationManager) {
      return Response.json(
        { message: "Unauthorized: No cultivation manager found" },
        { status: 403 },
      );
    }
    if (
      cultivationManager?.rootManager?.roleRequest?.status !=
        ROLE_STATUSES.APPROVED &&
      !cultivationWorker
    ) {
      return Response.json(
        { message: "Unauthorized: Role request not approved" },
        { status: 403 },
      );
    }
    await cultivationManager.populate({
      path: "fields",
      populate: fieldsPopulate,
    });

    if (slug) {
      const field = cultivationManager.fields.find((f) => f.slug === slug);
      if (!field) {
        return Response.json({ message: "Field not found" }, { status: 404 });
      }
      return Response.json({ field }, { status: 200 });
    } else {
      return Response.json(
        { fields: cultivationManager.fields },
        { status: 200 },
      );
    }
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

async function handlePOST(request) {
  try {
    const body = await request.json();
    const field = await cultivation.fields.create(body);
    return Response.json({ field }, { status: 201 });
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

async function handleDELETE(request) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    if (!slug) return new Response(null, { status: 400 });
    const field = await getScopedField({ slug });
    if (!field) return new Response(null, { status: 404 });
    await field.deleteOne();
    return Response.json(
      { message: "Field deleted successfully" },
      { status: 200 },
    );
  } catch {
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "CultivationManager", "CultivationWorker"]);
export const POST = protectApi(handlePOST, ["CultivationManager"]);
export const DELETE = protectApi(handleDELETE, ["Admin", "GeneralManager", "CultivationManager"]);
