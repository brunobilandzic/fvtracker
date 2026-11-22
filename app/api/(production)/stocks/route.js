import { getAssignableWorker } from "@/lib/auth/recordScope";
import { protectApi } from "@/lib/auth/protectApi";
import { createProductStock, getStocks } from "@/lib/production/stocks";
import { PRODUCTION_STOCK } from "@/lib/constants/production";
import { WAREHOUSE_STOCK } from "@/lib/constants/warehouse";
import { acceptWarehouseStock } from "@/lib/warehouses/accept";
import { Product } from "@/models/sectors/production/Product";
import { ProductionStock } from "@/models/sectors/production/Facility";
import { fetchManagerWorker } from "@/lib/auth/fetchSessionData";
import { PRODUCTION_MANAGER } from "@/lib/constants/users/managerTypes";
import { managerMorkerMap } from "@/lib/constants/users/managerWorker";

async function handleGET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    if (!productId) {
      const stocks = await getStocks();
      return Response.json(
        { stocks },
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    return new Response(null, { status: 400 });
  } catch {
    return Response.json(
      { error: "Request failed" },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function handlePOST(req) {
  // route to add or create new stock
  try {
    let {
      specificManager,
      worker: productionWorker,
      unauthorized,
    } = await fetchManagerWorker({
      managerNames: [PRODUCTION_MANAGER],
      workerType: managerMorkerMap[PRODUCTION_MANAGER],
    });

    if (unauthorized) {
      return Response.json({ unauthorized: true }, { status: 403 });
    }
    const stockType = req.nextUrl.searchParams.get("stockType");
    let stock;
    const body = await req.json();
    if (stockType === PRODUCTION_STOCK) {
      if (!Number.isFinite(Number(body.productionStockData?.quantity)) || Number(body.productionStockData.quantity) <= 0) return new Response(null, { status: 400 });
      if (!await getAssignableWorker(body.productionStockData.workerId, "ProductionWorker")) return new Response(null, { status: 404 });
      const { productionStock, productionProcess } =
        await createProductionStock({
          stockData: body.productionStockData,
        });

      return Response.json(
        { newProductionStock: productionStock, productionProcess },
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } else if (stockType == WAREHOUSE_STOCK) {
      const { warehouseStockData } = body;
      if (!Number.isFinite(Number(warehouseStockData?.quantity)) || Number(warehouseStockData.quantity) <= 0) return new Response(null, { status: 400 });
      if (!await getAssignableWorker(warehouseStockData.workerId, "ProductionWorker")) return new Response(null, { status: 404 });
      const product = await Product.findById(warehouseStockData.productId);
      const productionStock = await ProductionStock.findById(
        warehouseStockData.productionStockId,
      );
      if (!productionStock || !product || !productionStock.product.equals(product._id)) return new Response(null, { status: 404 });
      if (productionStock.quantity < warehouseStockData.quantity) {
        return Response.json(
          {
            error:
              "Unesena količina je veća od dostupne količine na proizvodnoj zalihi.",
          },
          {
            status: 400,
          },
        );
      }

      const { warehouseStock, warehouseAcceptanceProcess } =
        await acceptWarehouseStock({
          product,
          quantity: warehouseStockData.quantity,
          productionStock,
          warehouseId: warehouseStockData.warehouseId,
          comment: warehouseStockData.comment,
          workerId: warehouseStockData.workerId,
        });
      return Response.json(
        { newWarehouseStock: warehouseStock, warehouseAcceptanceProcess },
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch {
    return Response.json(
      { error: "Request failed" },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function createProductionStock({ stockData }) {
  const {
    productId,
    quantity,
    batchName,
    comment,
    productionFacilityId,
    workerId,
  } = stockData;
  const { productionStock, productionProcess } = await createProductStock({
    productId,
    batchName,
    productionFacilityId,
    quantity,
    comment,
    workerId,
  });
  return { productionStock, productionProcess };
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "ProductionManager", "FinancialManager", "ProductionWorker"]);
export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "ProductionManager", "ProductionWorker"]);
