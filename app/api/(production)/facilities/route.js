import { protectApi } from "@/lib/auth/protectApi";
import { fetchManager, fetchManagerWorker } from "@/lib/auth/fetchSessionData";
import {
  FINANCIAL_MANAGER,
  PRODUCTION_MANAGER,
} from "@/lib/constants/users/managerTypes";
import { getFacilities } from "@/lib/production/facilities/get";
import { createFacility } from "@/lib/production/facilities/create";
import { updateFacility } from "@/lib/production/facilities/update";
import { deleteFacilities } from "@/lib/production/facilities/delete";
import { makeUrlFriendly } from "@/lib/utils/strings";
import { managerMorkerMap } from "@/lib/constants/users/managerWorker";

const handleGET = async (req) => {
  try {
    let {
      specificManager,
      worker: productionWorker,
      unauthorized,
    } = await fetchManagerWorker({
      managerNames: [PRODUCTION_MANAGER, FINANCIAL_MANAGER],
      workerType: managerMorkerMap[PRODUCTION_MANAGER],
    });

    if (unauthorized) {
      return Response.json({ unauthorized: true }, { status: 403 });
    }
    const facilities = await getFacilities({});

    return Response.json({ facilities }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Greška pri dohvaćanju postrojenja" },
      { status: 500 },
    );
  }
};

const handlePOST = async (req) => {
  try {
    const { unauthorized } = await fetchManager({
      managerNames: [PRODUCTION_MANAGER],
    });
    if (unauthorized) {
      return Response.json({ unauthorized: true }, { status: 403 });
    }
    const { name, description, volume } = await req.json();
    const facility = await createFacility({ name, description, volume });
    return Response.json({ facility }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Greška pri kreiranju postrojenja" },
      { status: 500 },
    );
  }
};

const handlePUT = async (req) => {
  try {
    const { unauthorized } = await fetchManager({
      managerNames: [PRODUCTION_MANAGER],
    });
    if (unauthorized) {
      return Response.json({ unauthorized: true }, { status: 403 });
    }
    const id = req.nextUrl.searchParams.get("id");
    const { name, description, volume } = await req.json();
    const facility = await updateFacility({
      facilityId: id,
      data: { name, description, volume, slug: makeUrlFriendly(name) },
    });
    return Response.json({ facility }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Greška pri ažuriranju postrojenja" },
      { status: 500 },
    );
  }
};

const handleDELETE = async (req) => {
  try {
    const { unauthorized } = await fetchManager({
      managerNames: [PRODUCTION_MANAGER],
    });
    if (unauthorized) {
      return Response.json({ unauthorized: true }, { status: 403 });
    }
    const idsString = req.nextUrl.searchParams.get("ids");
    const facilityIds = idsString.split(",");
    await deleteFacilities({ facilityIds });
    return Response.json({ success: true }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Greška pri brisanju postrojenja" },
      { status: 500 },
    );
  }
};

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "ProductionManager", "FinancialManager", "ProductionWorker"]);
export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "ProductionManager"]);
export const PUT = protectApi(handlePUT, ["Admin", "GeneralManager", "ProductionManager"]);
export const DELETE = protectApi(handleDELETE, ["Admin", "GeneralManager", "ProductionManager"]);
