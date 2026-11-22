import { protectApi } from "@/lib/auth/protectApi";
import auth from "@/lib/auth";
import { GENERAL_MANAGER } from "@/lib/constants/users/managerTypes";
import { getGeneralManager } from "@/lib/generalManager";

async function handleGET() {
  try {
    const generalManager = await getGeneralManager();
    return Response.json({ generalManager }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Greška pri dohvaćanju Generalnog Managera" },
      { status: 500 },
    );
  }
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager"]);
