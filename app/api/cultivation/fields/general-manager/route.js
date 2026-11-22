import { protectApi } from "@/lib/auth/protectApi";
import { Field } from "@/models/sectors/cultivation/Field";
import fieldsPopulate from "../populate";

async function handleGET() {
  const fields = await Field.find().populate(fieldsPopulate);
  return Response.json({ fields }, { status: 200 });
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "FinancialManager"]);
