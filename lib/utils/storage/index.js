import { fetchWarehouses, fetchWarehouseRequests } from "@/store/warehouse";

export const fillWarehouseRedux = ({ dispatch }) => {
  dispatch(fetchWarehouses());
  dispatch(fetchWarehouseRequests());
};
