import { SEED_ERROR } from "@/lib/constants/errors/db/seed";
import appUsersJsonArray from "@/seed/data/appUsers";
import { AppUser } from "@/models/user/AppUser";
import usersConstants from "@/lib/constants/users";
import { createGeneralManager } from "@/seed/users/generalManager";
import { createManager } from "@/seed/users/manager";
import { createAdmin } from "./admin";
import { GeneralManager } from "@/models/user/managers/GeneralManager";
import { GENERAL_MANAGER_USERNAME } from "@/lib/constants/users/managersUsernameModel";
import { seedWorkers } from "./workers";

export default async (passwords) => {
  console.log("Seeding appUsers...");

  // Create admin and general manager first
  const admin = await createAdmin(passwords.get("admin"));
  const generalManager = await createGeneralManager({ approve: true, passwords });

  // Now create other app users
  const promises = [];
  for (const appUserData of appUsersJsonArray) {
    if (
      ![GENERAL_MANAGER_USERNAME, "admin"].includes(appUserData.username)
    )
      promises.push(createAppUser({
        ...appUserData,
        password: passwords.get(appUserData.username),
        demoAccount: true,
      }, generalManager._id));
  }

  const results = await Promise.all(promises);
  if (!results || results.length === 0) {
    console.log("No appUsers were created.");
    throw new Error(SEED_ERROR, "No AppUsers were created");
  }

  const managersIds = results
    .map((res) => res.managerId)
    .filter((id) => id !== null && id !== undefined);

  await GeneralManager.updateOne(
    { _id: generalManager._id },
    {
      $push: {
        managers: {
          $each: managersIds,
        },
      },
    },
  ).exec();

  console.log("Seeded", managersIds.length, "managers.");
  console.log(`Seeded ${results.length} appUsers.`);
  await seedWorkers(passwords);
  return {
    appUsersIds: results.map((res) => res.appUserId),
    managersIds: results.map((res) => res.managerId),
    adminId: admin._id,
    generalManagerId: generalManager._id,
  };
};

export const createAppUser = async (appUserData, generalManagerId) => {
  const appUser = new AppUser(appUserData);
  const username = appUser.username;
  await appUser.save();

  if (
    username in usersConstants.usernameToModel &&
    username !== GENERAL_MANAGER_USERNAME &&
    username !== "admin"
  ) {
    // now we have to crate a root manager and specific manager
    const managerModelName = usersConstants.usernameToModel[username];
    const { rootManager, specificManager } = await createManager(
      appUser._id,
      managerModelName,
      generalManagerId,
    );

    if (!rootManager || !specificManager) {
      throw new Error(SEED_ERROR, `Manager not created for user ${username}`);
    }
    appUser.rootManager = rootManager._id;
    await appUser.save();
    return { appUserId: appUser._id, managerId: rootManager._id };
  }

  if (appUser) {
    return { appUserId: appUser._id };
  }
  throw new Error(SEED_ERROR, `AppUser creation failed for user ${username}`);
};

//create manager
