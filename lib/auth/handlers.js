import dbConnect from "@/lib/db/mongooseConnect";
import "@/models";
import { AppUser } from "@/models/user/AppUser";
import bcrypt from "bcrypt";
import {
  GENERAL_MANAGER,
  MANAGER_TRANSLATION,
  MANAGER_TYPES,
} from "../constants/users/managerTypes";
import { GeneralManager } from "@/models/user/managers/GeneralManager";
import { RootManager } from "@/models/user/managers/RootManager";
import { ROLE_STATUSES } from "../constants/users";
import mongoose from "mongoose";
import { EMPLOYMENT_STATUS_EMPLOYED } from "../constants/users/workers";

import { isDemoMode, registrationEnabled } from "../demoMode";
import { Admin } from "@/models/user/Admin";
import { getDemoRole } from "./demoRoles";

// A timing placeholder for unknown accounts; it is never used as an account credential.
const dummyHash = "$2b$12$JYjKvTIRSeoMXHH/wEpvheMlp/UslHAyk4uRsUAHNU3RuXnzHg0si";

function boundedString(value, limit) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit;
}

export async function handleCredentials(credentials) {
  if (!credentials) return null;
  const { login, password, isSignUp } = credentials;
  if (!boundedString(password, 72) || password.length < 12 || Buffer.byteLength(password) > 72) return null;

  if (isSignUp === true || isSignUp === "true") {
    if (!registrationEnabled()) return null;
    const { email, username, name, surname, requestedRole, passwordConfirm } = credentials;
    if (
      !boundedString(email, 254) || !boundedString(username, 64) ||
      !boundedString(name, 100) || !boundedString(surname, 100) ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) ||
      !/^[a-z0-9_.-]+$/i.test(username.trim()) ||
      password !== passwordConfirm ||
      (requestedRole && (!MANAGER_TYPES.includes(requestedRole) || requestedRole === "Worker"))
    ) return null;
    await dbConnect();
    const user = await signUpCredentials({
      email: email.trim().toLowerCase(),
      username: username.trim().toLowerCase(),
      name: name.trim(), surname: surname.trim(), password, requestedRole,
    });
    return user ? { id: String(user._id) } : null;
  }

  if (!boundedString(login, 254)) return null;
  const identifier = login.trim().toLowerCase();
  const demo = isDemoMode();
  const role = getDemoRole(credentials.demoRole);
  if (credentials.demoRole !== undefined && (!demo || role?.username !== identifier)) return null;
  await dbConnect();
  const user = await AppUser.findOne({
    provider: "credentials",
    ...(demo && { demoAccount: true, isAdmin: { $ne: true } }),
    ...(role ? { username: role.username } : { $or: [{ email: identifier }, { username: identifier }] }),
  }).select("+password");
  const valid = await bcrypt.compare(password, user?.password || dummyHash);
  if (!valid || !user?.password) return null;

  const id = String(user._id);
  if (role) {
    const [identity, admin] = await Promise.all([
      getSessionIdentity(id),
      Admin.exists({ appUser: user._id }),
    ]);
    if (!identity || admin) return null;
    if (role.managerType) {
      if (identity.workerType || identity.managerModelName !== role.managerType || !identity.managerId ||
          identity.roleStatus !== ROLE_STATUSES.APPROVED) return null;
    } else if (identity.managerModelName || identity.workerType !== role.workerType || !identity.employed) {
      return null;
    }
  }

  return { id };
}

export async function getSessionIdentity(id) {
  if (!mongoose.isObjectIdOrHexString(id)) return null;
  await dbConnect();
  const demo = isDemoMode();
  const user = await AppUser.findOne({
    _id: id,
    ...(demo && { demoAccount: true, isAdmin: { $ne: true } }),
  }).select("name surname email username rootManager worker").populate([
    { path: "rootManager", populate: { path: "roleRequest", select: "status" } },
    { path: "worker", select: "employmentRequest __t manager",
      populate: { path: "employmentRequest", select: "status" } },
  ]);
  if (!user) return null;

  const root = user.rootManager;
  const managerModelName = MANAGER_TYPES.includes(root?.managerModelName) &&
    root.managerModelName !== "Worker" ? root.managerModelName : null;
  const managerQuery = managerModelName
    ? mongoose.model(managerModelName).findOne({ rootManager: root._id }).select("generalManagerRequest")
    : null;
  if (managerModelName === GENERAL_MANAGER) {
    managerQuery.populate({ path: "generalManagerRequest", select: "status" });
  }
  const [manager, admin] = await Promise.all([
    managerQuery,
    demo ? null : Admin.exists({ appUser: user._id }),
  ]);
  const displayName = [user.name, user.surname].filter(Boolean).join(" ");
  return {
    appUserId: String(user._id),
    name: displayName,
    displayName,
    email: user.email,
    username: user.username,
    managerModelName,
    rootManagerId: root ? String(root._id) : null,
    workerManagerId: user.worker?.manager ? String(user.worker.manager) : null,
    managerId: manager ? String(manager._id) : null,
    roleStatus: root?.roleRequest?.status ?? null,
    generalManagerRequest: manager?.generalManagerRequest?.status ??
      (managerModelName === GENERAL_MANAGER ? ROLE_STATUSES.PENDING : null),
    isAdmin: Boolean(admin),
    workerType: user.worker?.__t ?? null,
    workerId: user.worker ? String(user.worker._id) : null,
    employed: user.worker ? user.worker.employmentRequest?.status === EMPLOYMENT_STATUS_EMPLOYED : null,
  };
}

async function signUpCredentials({
  email,
  username,
  name,
  surname,
  password,
  requestedRole,
}) {
  const existingUserEmail = await AppUser.findOne({ email });

  if (existingUserEmail) {
    throw new Error("Korisnik sa ovom email adresom već postoji.");
  }

  const existingUserUsername = await AppUser.findOne({ username });

  if (existingUserUsername) {
    throw new Error("Korisnik sa ovim korisničkim imenom već postoji.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = new AppUser({
    email,
    username,
    name,
    surname,
    password: hashedPassword,
    provider: "credentials",
  });
  if (requestedRole) {
    if (requestedRole === GENERAL_MANAGER) {
      const existingGeneralManager = await GeneralManager.findOne().populate(
        "generalManagerRequest",
      );
      if (
        existingGeneralManager &&
        existingGeneralManager.generalManagerRequest?.status ===
          ROLE_STATUSES.APPROVED
      ) {
        throw new Error(
          "Generalni menadžer s odobrenom ulogom već postoji. Ne možete kreirati drugog generalnog menadžera.",
        );
      }
      const generalManager = await new GeneralManager();
      const generalManagerRootManager = await new RootManager({
        appUser: newUser._id,
        managerModelName: GENERAL_MANAGER,
        generalManager: generalManager._id,
      });
      generalManager.rootManager = generalManagerRootManager._id;
      await generalManager.save();
      await generalManagerRootManager.save();
      newUser.rootManager = generalManagerRootManager._id;
      await newUser.populate("rootManager");
      await newUser.save();
      return newUser;
    }
    if (!MANAGER_TYPES.includes(requestedRole) || requestedRole === "Worker") {
      throw new Error(`Zatraženi tip menadžera nije validan: ${requestedRole}`); // Log the invalid role
    }
    const existingManagers = await mongoose
      .model(requestedRole)
      .find()
      .populate({
        path: "rootManager",
        select: "roleRequest",
        populate: { path: "roleRequest", select: "status" },
      });
    const hasApprovedManager = existingManagers.some((manager) => {
      return (
        manager.rootManager?.roleRequest?.status === ROLE_STATUSES.APPROVED
      );
    });
    if (hasApprovedManager) {
      throw new Error(
        `Menadžer ${MANAGER_TRANSLATION[requestedRole]} s odobrenom ulogom već postoji. Ne možete kreirati drugog ${MANAGER_TRANSLATION[requestedRole]}.`,
      );
    }
    const generalManager = await GeneralManager.findOne();
    if (!generalManager) {
      throw new Error(
        "Ne postoji generalni menadžer nužan prije kreiranja drugih menadžera.",
      );
    }
    const rootManager = await new RootManager({
      appUser: newUser._id,
      managerModelName: requestedRole,
      generalManager: generalManager._id,
    });
    generalManager.managers.push(rootManager._id);
    const specificManager = await models.user[requestedRole].create({
      rootManager: rootManager._id,
    });


    rootManager.appUser = newUser._id;

    await specificManager.save();
    await rootManager.save();
    await generalManager.save();
    newUser.rootManager = rootManager._id;
    await newUser.populate("rootManager");
  }

  await newUser.save();
  return newUser;
}
