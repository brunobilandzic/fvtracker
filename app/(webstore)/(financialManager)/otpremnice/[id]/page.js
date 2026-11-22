import { notFound } from "next/navigation";
import { fetchManagerWorker } from "@/lib/auth/fetchSessionData";
import ShipmentPageComponent from "@/components/warehouse/shipment";
import dbConnect from "@/lib/db/mongooseConnect";
import { getShipmentById } from "@/lib/shipment/get";
import { sanitize } from "@/lib/utils/objects";
import React from "react";

async function ShipmentPage({ params }) {
  const { unauthorized } = await fetchManagerWorker({
    managerNames: ["FinancialManager"],
    workerType: "FinancialWorker",
  });
  if (unauthorized) notFound();
  await dbConnect();
  const { id } = await params;
  const shipment = await getShipmentById({ id });
  return (
    <div>
      <ShipmentPageComponent shipment={sanitize(shipment)} />
    </div>
  );
}

export default ShipmentPage;
