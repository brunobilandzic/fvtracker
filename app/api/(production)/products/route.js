import { protectApi } from "@/lib/auth/protectApi";
import { fetchManager } from "@/lib/auth/fetchSessionData";
import { PRODUCTION_MANAGER } from "@/lib/constants/users/managerTypes";
import {
  createProduct,
  deleteProducts,
  getProducts,
  updateProduct,
} from "@/lib/production/product";

const handleGET = async (req) => {
  try {
    const products = await getProducts();

    return Response.json({ products: products.map(({ _id, name, slug, description, price, ingredients }) => ({
      _id, name, slug, description, price,
      ingredients: ingredients.map(({ cropVariety }) => ({
        cropVariety: cropVariety ? { name: cropVariety.name } : null,
      })),
    })) });
  } catch {
    return Response.json(
      { error: "Failed to fetch managers" },
      { status: 500 },
    );
  }
};

const handlePUT = async (req) => {
  try {
    const id = req.nextUrl.searchParams.get("id");
    const body = await req.json();
    const product = await updateProduct({
      _updatedProduct: body,
      productId: id,
    });
    return Response.json({ product }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
};

const handlePOST = async (req) => {
  try {
    const body = await req.json();
    const product = await createProduct({
      _newProductData: body,
    });

    return Response.json({ product }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
};

const handleDELETE = async (req) => {
  try {
    const idsString = req.nextUrl.searchParams.get("ids");
    const productIds = idsString.split(",");
    const product = await deleteProducts({ productIds });

    return Response.json({ product }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
};

const publicCatalog = protectApi(handleGET, "public");
const productionCatalog = protectApi(async () => Response.json({ products: await getProducts() }),
  ["Admin", "GeneralManager", "ProductionManager", "ProductionWorker", "FinancialManager"]);

export const GET = (request, context) =>
  request.nextUrl.searchParams.get("scope") === "production"
    ? productionCatalog(request, context)
    : publicCatalog(request, context);
export const POST = protectApi(handlePOST, ["Admin", "GeneralManager", "ProductionManager"]);
export const PUT = protectApi(handlePUT, ["Admin", "GeneralManager", "ProductionManager"]);
export const DELETE = protectApi(handleDELETE, ["Admin", "GeneralManager", "ProductionManager"]);
