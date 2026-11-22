import dbConnect from "@/lib/db/mongooseConnect";
import { AppUser } from "@/models/user/AppUser";

export async function getAppUser(filter) {
  await dbConnect();
  const appUser = await AppUser.findOne(filter);
  if (!appUser) throw new Error("App user not found");
  return appUser;
}
