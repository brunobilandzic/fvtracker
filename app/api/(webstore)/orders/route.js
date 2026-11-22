import { getCurrentIdentity } from "@/lib/auth/fetchSessionData";
import { protectApi } from "@/lib/auth/protectApi";
import { fetchManager } from "@/lib/auth/fetchSessionData";
import { FINANCIAL_MANAGER } from "@/lib/constants/users/managerTypes";
import { createOrder, deleteOrder, getOrders } from "@/lib/webstore/orders";

async function handlePOST(req) {
  try {
    const { cartItems, customerData } = await req.json();
    const { email } = await getCurrentIdentity();
    if (!email || !Array.isArray(cartItems) || !cartItems.length || cartItems.length > 100 ||
        cartItems.some(item => !item?.product?._id || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) < 1)) {
      return Response.json({ error: "Invalid order" }, { status: 400 });
    }
    const order = await createOrder({ cartItems, customerData: { ...customerData, email } });
    return Response.json({ order }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Greška pri izradi narudžbe" },
      { status: 500 },
    );
  }
}

async function handleGET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const orders = await getOrders({ customerId });
    return Response.json({ orders }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Greška pri dohvaćanju narudžbi" },
      { status: 500 },
    );
  }
}

async function handleDELETE(req) {
  try {
    const { unauthorized } = await fetchManager({
      managerNames: [FINANCIAL_MANAGER],
    });
    if (unauthorized) {
      return Response.json({ error: "Nedovoljno ovlasti" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("id");
    await deleteOrder({ orderId });
    return Response.json({ message: "Narudžba obrisana" }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Greška pri brisanju narudžbe" },
      { status: 500 },
    );
  }
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "FinancialManager", "FinancialWorker"]);
export const POST = protectApi(handlePOST);
export const DELETE = protectApi(handleDELETE, ["Admin", "GeneralManager", "FinancialManager"]);
