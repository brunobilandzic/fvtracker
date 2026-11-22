import { protectApi } from "@/lib/auth/protectApi";
import { getCurrentIdentity } from "@/lib/auth/fetchSessionData";
import { createWarehouse, deleteWarehouses } from "@/lib/warehouses";
import { getWarehouses } from "@/lib/warehouses/get";
import { Warehouse } from "@/models/sectors/storage/Warehouse";
import { WarehouseManager } from "@/models/user/managers/WarehouseManager";
import populate from "@/lib/warehouses/populateConfig";

const managers = ["Admin", "GeneralManager", "WarehouseManager"];

async function scope(user) {
  if (user.managerModelName === "WarehouseManager") {
    return { warehouseManager: user.managerId };
  }
  if (user.workerType === "WarehouseWorker") {
    const manager = await WarehouseManager.findOne({ rootManager: user.workerManagerId }).select("_id");
    return { warehouseManager: manager?._id ?? null };
  }
  return {};
}

export const GET = protectApi(async (request) => {
  const user = await getCurrentIdentity();
  const filter = await scope(user);
  const id = request.nextUrl.searchParams.get("id");
  const selectionOnly = ["ProductionManager", "ProductionWorker", "FinancialManager", "FinancialWorker"]
    .includes(user.managerModelName || user.workerType);
  if (filter.warehouseManager === null) return Response.json({ warehouses: [] });
  if (id && selectionOnly) return new Response(null, { status: 403 });
  if (id) {
    const warehouse = await Warehouse.findOne({ _id: id, ...filter }).populate(populate);
    return warehouse ? Response.json({ warehouse }) : new Response(null, { status: 404 });
  }
  if (selectionOnly) {
    const warehouses = await Warehouse.find().select("name slug");
    return Response.json({ warehouses });
  }
  return Response.json({ warehouses: await getWarehouses({ managerId: filter.warehouseManager }) });
}, [...managers, "WarehouseWorker", "ProductionManager", "ProductionWorker", "FinancialManager", "FinancialWorker"]);
export const POST = protectApi(async (request) => {
  const user = await getCurrentIdentity();
  const warehouseManager = await WarehouseManager.findById(user.managerId);
  const { name, description, volume } = await request.json();
  const warehouse = await createWarehouse({
    warehouseData: { name, description, volume },
    warehouseManager,
  });
  return Response.json({ warehouse }, { status: 201 });
}, ["WarehouseManager"]);
export const PUT = protectApi(async (request) => {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "Warehouse ID is required" }, { status: 400 });
  const warehouse = await Warehouse.findOne({ _id: id, ...await scope(await getCurrentIdentity()) });
  if (!warehouse) return new Response(null, { status: 404 });
  const { name, description, volume } = await request.json();
  if (name !== undefined) warehouse.name = name;
  if (description !== undefined) warehouse.description = description;
  if (volume !== undefined) warehouse.volume = volume;
  await warehouse.save();
  return Response.json({ success: true });
}, managers);
export const DELETE = protectApi(async (request) => {
  const id = request.nextUrl.searchParams.get("id");
  const filter = await scope(await getCurrentIdentity());
  if (id) filter._id = id;
  const ids = await Warehouse.find(filter).distinct("_id");
  if (id && !ids.length) return new Response(null, { status: 404 });
  await deleteWarehouses({ ids });
  return Response.json({ success: true });
}, managers);
