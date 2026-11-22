import "@/models";
import users from "./users";
import fields from "./cultivation/fields";
import crops from "./cultivation/crops";
import production from "./production";
import sales from "./sales";

export async function seedDemoData(passwords) {
  await crops.mainTypes();
  await users.all(passwords);
  await fields.create();
  await production.seedProduction();
  await sales.seedSales();
}
