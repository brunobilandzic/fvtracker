import { protectApi } from "@/lib/auth/protectApi";
import mongoose from "mongoose";
import { findManagerName } from "./naming";

async function handleGET(request) {
  const { searchParams } = new URL(request.url);
  const managersType = searchParams.get("managersType");
  const all = searchParams.get("all");
  if (all) {
    const rootManagers = await mongoose.models.RootManager.find({})
      .select("appUser")
      .populate({
        path: "appUser",
        select: "name surname",
      });
    return Response.json({ managers: rootManagers });
  }
  const model = findManagerName({ managersType });
  if (!model) return new Response(null, { status: 400 });
  const managers = await mongoose
    .model(model)
    .find()
    .populate([
      {
        path: "rootManager",
        select: "appUser",
        populate: { path: "appUser", select: "name surname" },
      },
    ]);

  return Response.json({ managers });
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "CultivationManager", "ProductionManager", "FinancialManager", "WarehouseManager", "FinancialWorker"]);
