import { createOrders } from "./orders";
import { createWarehouseRequests } from "./warehouseRequests";
import { arrayRandomSlice } from "@/lib/utils/objects";

export default {
  seedSales: async () => {
    console.log("seeding orders...");
    const orders = await createOrders();
    console.log("seeding orders completed");
    // create req for only one order
    const warehouseRequests = await createWarehouseRequests({
      orders: arrayRandomSlice(orders, 5),
    });
    console.log(`seeded ${warehouseRequests.length} warehouse requests`);
  },
};
