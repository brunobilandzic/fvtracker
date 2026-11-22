import { protectApi } from "@/lib/auth/protectApi";
import { getCurrentIdentity } from "@/lib/auth/fetchSessionData";
import { createProcurment } from "@/lib/procurments/create";
import { getAllProcurments, getProcurments } from "@/lib/procurments/get";
import { Procurment } from "@/models/documents/Procurment";
import { PROCURMENT_STATUSES } from "@/lib/constants/documents/procurments";

const finance = ["Admin", "GeneralManager", "FinancialManager"];
const managers = [...finance, "CultivationManager", "ProductionManager", "WarehouseManager"];

function canReadAll(user) {
  return user.isAdmin || finance.includes(user.managerModelName);
}

export const GET = protectApi(async () => {
  const user = await getCurrentIdentity();
  const procurments = canReadAll(user)
    ? await getAllProcurments()
    : await getProcurments(user.rootManagerId);
  return Response.json({ procurments });
}, managers);
export const POST = protectApi(async (request) => {
  const { newProcurmentData: { name, description, items } } = await request.json();
  const { rootManagerId } = await getCurrentIdentity();
  const procurment = await createProcurment({ name, description, items, manager: rootManagerId });
  return Response.json({ procurment }, { status: 201 });
}, managers.filter(role => role !== "Admin"));
export const PUT = protectApi(async (request) => {
  const { procurmentId, newStatus } = await request.json();
  if (!PROCURMENT_STATUSES.includes(newStatus)) return new Response(null, { status: 400 });
  const procurment = await Procurment.findByIdAndUpdate(procurmentId, { status: newStatus });
  if (!procurment) return new Response(null, { status: 404 });
  return Response.json({ message: "Status nabavke promijenjen." });
}, finance);
export const DELETE = protectApi(async (request) => {
  const { procurmentId } = await request.json();
  const user = await getCurrentIdentity();
  const procurment = await Procurment.findOneAndDelete({
    _id: procurmentId,
    ...(!canReadAll(user) && { manager: user.rootManagerId }),
  });
  if (!procurment) return new Response(null, { status: 404 });
  return Response.json({ message: "Nabavka obrisana." });
}, managers);
