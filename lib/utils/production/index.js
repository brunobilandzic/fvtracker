import api from "@/lib/api";
import handleError from "@/lib/constants/errors/client/handleError";
import { setLoading } from "@/store/loading";
import {
  refreshFacilities,
  refreshProductsStocks,
  setProducts,
} from "@/store/production";
import { fetchWarehouses } from "@/store/warehouse";

export default async function fillProductionRedux({ dispatch, all, signal }) {
  try {
    dispatch(setLoading(true));
    const res = await api.get("/productionManager", { signal });
    if (signal.aborted) return;
    if (all && res.data.productionManagers) {
      dispatch(
        setProducts(res.data.productionManagers.flatMap((pm) => pm.products)),
      );
      dispatch(refreshFacilities());
      dispatch(fetchWarehouses());
      dispatch(refreshProductsStocks());
      return;
    }
    const productionManager = res.data.productionManager;

    dispatchPayloads({
      manager: productionManager,
      dispatch,
    });
    return productionManager;
  } catch (error) {
    if (signal.aborted) return;
    console.error("Error fetching production manager data:", error);
    handleError({
      ...error,
      generalMessage: "Greška pri dohvaćanju podataka o proizvodnji",
    });
  } finally {
    dispatch(setLoading(false));
  }
}

const dispatchPayloads = ({ manager, dispatch, batches }) => {
  manager?.products && dispatch(setProducts(manager?.products));
  dispatch(refreshFacilities());
  dispatch(fetchWarehouses());
  dispatch(refreshProductsStocks());
};

/* const mapProductsStocks = ({ manager }) => {
  return manager.products.map((product) => ({
    product: {
      name: product.name,
      description: product.description,
    },
    quantity: product.stock?.quantity,
    productionProcesses: product.stock?.productionProcesses,
  }));
};
 */
