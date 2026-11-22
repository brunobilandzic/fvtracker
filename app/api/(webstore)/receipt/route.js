import { getAssignableWorker } from "@/lib/auth/recordScope";
import { protectApi } from "@/lib/auth/protectApi";
import { fetchManager, fetchManagerWorker } from "@/lib/auth/fetchSessionData";
import { FINANCIAL_MANAGER } from "@/lib/constants/users/managerTypes";
import { managerMorkerMap } from "@/lib/constants/users/managerWorker";
import { Receipt } from "@/models/sectors/sales";
import { ShipmentItem } from "@/models/sectors/sales/Shipment";
import { Worker } from "@/models/user/workers";

async function handlePOST(req) {
  try {
    let { specificManager, worker, unauthorized } = await fetchManagerWorker({
      managerNames: [FINANCIAL_MANAGER],
      workerType: managerMorkerMap[FINANCIAL_MANAGER],
    });

    if (unauthorized) {
      return Response.json(
        { message: "Nemate pravo izrade otpremnica" },
        { status: 403 },
      );
    }

    const { shipmentItemId, workerId } = await req.json();

    const requestWorker = await getAssignableWorker(workerId, "FinancialWorker");
    if (!requestWorker) return new Response(null, { status: 404 });

    const shipmentItem = await ShipmentItem.findById(shipmentItemId).populate([
      {
        path: "shipment",
        select: "warehouseRequest",
        populate: {
          path: "warehouseRequest",
          select: "order",
          populate: {
            path: "order",
            select: "receipts",
          },
        },
      },
    ]);

    if (!shipmentItem) {
      return Response.json(
        { error: "Stavka pošiljke nije pronađena" },
        { status: 404 },
      );
    }

    if (shipmentItem.receipt) return new Response(null, { status: 409 });
    const newReceipt = new Receipt({
      shipmentItem: shipmentItem._id,
      financialWorker: workerId,
    });

    requestWorker.receipts.push(newReceipt._id);
    shipmentItem.shipment.warehouseRequest.order.receipts.push(newReceipt._id);
    shipmentItem.receipt = newReceipt._id;
    await newReceipt.save();
    await shipmentItem.shipment.warehouseRequest.order.save();
    await shipmentItem.save();
    await requestWorker.save();

    return Response.json({ newReceipt, message: "Račun uspješno kreiran" });
  } catch {
    return Response.json({
      error: "Greška prilikom kreiranja računa",
    });
  }
}

export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "FinancialManager", "FinancialWorker"]);
