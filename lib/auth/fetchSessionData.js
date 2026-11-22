import { AsyncLocalStorage } from "node:async_hooks";
import dbConnect from "@/lib/db/mongooseConnect";
import { isDemoMode } from "@/lib/demoMode";
import { EMPLOYMENT_STATUS_EMPLOYED } from "@/lib/constants/users/workers";
import { MANAGER_TYPES } from "@/lib/constants/users/managerTypes";
import { getServerSession } from "@/auth";
import { AppUser } from "@/models/user/AppUser";
import mongoose from "mongoose";
import { GENERAL_MANAGER } from "../constants/users/managerTypes";
import { ROLE_STATUSES } from "../constants/users";
import "@/models/documents/requests/RoleRequest";
import { cache } from "react";
const requestIdentity = new AsyncLocalStorage();

export function withSessionIdentity(user, callback) {
  return requestIdentity.run({ user }, callback);
}

export const getCurrentIdentity = cache(async () => {
  const context = requestIdentity.getStore();
  return context ? context.user : (await getServerSession())?.user;
});

export const fetchSessionAppUser = cache(async () => {
  const user = await getCurrentIdentity();
  if (!user?.appUserId) return null;
  await dbConnect();
  return AppUser.findById(user.appUserId);
});

export const checkGeneralManagerRequest = async (generalManager) => {
  if (
    !generalManager.generalManagerRequest ||
    generalManager.generalManagerRequest.status != ROLE_STATUSES.APPROVED
  ) {
    return { unauthorized: true };
  }
  return { unauthorized: false };
};

const fetchSpecificManagerCached = cache(async (managerName) => {
  const appUser = await fetchSessionAppUser();
  if (!appUser?.rootManager || !MANAGER_TYPES.includes(managerName) || managerName === "Worker") {
    return { specificManager: null, failReason: "NOT_FOUND" };
  }

  const specificManager = await mongoose.models[managerName]
    .findOne({ rootManager: appUser.rootManager })
    .populate([
      {
        path: "rootManager",
        populate: { path: "roleRequest", select: "status" },
      },
      ...(managerName === GENERAL_MANAGER
        ? [{ path: "generalManagerRequest" }]
        : []),
    ]);

  if (!specificManager || !specificManager.rootManager) {
    return { specificManager: null, failReason: "NOT_FOUND" };
  }

  if (managerName !== GENERAL_MANAGER) {
    const roleRequest = specificManager.rootManager.roleRequest;
    if (!roleRequest) {
      return { specificManager: null, failReason: "NO_ROLE_REQUEST" };
    }
    if (roleRequest.status !== ROLE_STATUSES.APPROVED) {
      return { specificManager: null, failReason: "NOT_APPROVED" };
    }
  } else {
    const generalManagerRequest = specificManager.generalManagerRequest;
    if (!generalManagerRequest) {
      return { specificManager: null, failReason: "NO_ROLE_REQUEST" };
    }
    if (generalManagerRequest.status !== ROLE_STATUSES.APPROVED) {
      return { specificManager: null, failReason: "NOT_APPROVED" };
    }
  }

  return { specificManager, failReason: null };
});

export async function fetchSessionSpecificManager({
  managerName,
  throwError = true,
}) {
  const { specificManager, failReason } =
    await fetchSpecificManagerCached(managerName);

  if (specificManager) return specificManager;

  // status postoji ali nije odobren → tiho null, nikad ne baca (staro ponašanje)
  if (failReason === "NOT_APPROVED") return null;

  if (throwError) throw new Error("Access denied");

  return null;
}

export const fetchAdmin = async () => {
  const appUser = await fetchSessionAppUser();
  if (!appUser || isDemoMode()) return { unauthorized: true };
  const admin = await mongoose.models.Admin.findOne({ appUser: appUser._id });
  if (!admin) {
    return { unauthorized: true };
  }
  return { admin };
};

export async function fetchWorker({ workerType }) {
  const appUser = await fetchSessionAppUser();
  if (!appUser) return { worker: null, unauthorized: true };
  const worker = await mongoose.models.Worker.findOne({
    appUser: appUser._id,
    ...(workerType && { __t: workerType }),
  }).populate(["manager", { path: "employmentRequest", select: "status" }]);
  if (worker?.employmentRequest?.status !== EMPLOYMENT_STATUS_EMPLOYED) {
    return { worker: null, unauthorized: true };
  }
  return { worker, unauthorized: false };
}

export async function fetchManagerWorker({ managerNames = [], workerType }) {
  const { specificManager, generalManager, unauthorized, isAdmin } =
    await fetchManager({
      managerNames,
      worker: true,
    });
  if (unauthorized) {
    return { unauthorized: true };
  }
  if (!unauthorized && (specificManager || generalManager || isAdmin)) {
    return { specificManager, generalManager, unauthorized: false, isAdmin };
  }
  const { worker, unauthorized: workerUnauthorized } = await fetchWorker({
    workerType,
  });
  if (workerUnauthorized) {
    return { unauthorized: true };
  }

  return { worker, specificManager, unauthorized: false };
}

export async function fetchManager({ managerNames = [], worker = false }) {
  const { admin } = await fetchAdmin();
  if (admin) {
    return { unauthorized: false, isAdmin: true };
  }
  const response = {
    generalManager: null,
    specificManager: null,
  };
  const generalManager = await fetchSessionSpecificManager({
    managerName: GENERAL_MANAGER,
    throwError: false,
  });

  if (generalManager) {
    const { unauthorized } = await checkGeneralManagerRequest(generalManager);
    if (unauthorized) {
      return { unauthorized: true };
    }
    response.generalManager = generalManager;
  }
  if (managerNames.length === 0 && !worker) {
    // if no specific manager types provided, return general manager if exists or unauthorized
    return response.generalManager ? response : { unauthorized: true };
  }
  for (const managerName of managerNames) {
    const specificManager = await fetchSessionSpecificManager({
      managerName,
      throwError: false,
    });
    if (specificManager) {
      response.specificManager = specificManager;
    }
  }

  if (!response.generalManager && !response.specificManager && !worker) {
    return { unauthorized: true };
  }
  return response;
}

export const checkManager = async ({ managerNames = [] }) => {
  const { unauthorized, specificManager } = await fetchManager({
    managerNames,
  });
  if (unauthorized) {
    throw new Error("Unauthorized: no manager found for session user");
  }
  return specificManager;
};

export const fetchSessionRootManager = async () => {
  const { admin } = await fetchAdmin();
  const { generalManager } = await fetchManager({
    managerNames: [GENERAL_MANAGER],
  });
  if (admin || generalManager) {
    return {
      unauthorized: false,
      rootManager: null,
      isAdmin: true,
      generalManager,
    };
  }
  const appUser = await fetchSessionAppUser();
  if (!appUser?.rootManager) return { unauthorized: true };
  const rootManager = await mongoose.models.RootManager.findOne({
    _id: appUser.rootManager,
    appUser: appUser._id,
  }).populate({ path: "roleRequest", select: "status" });

  if (rootManager?.roleRequest?.status !== ROLE_STATUSES.APPROVED) {
    return { unauthorized: true };
  }
  return {
    rootManager,
  };
};

export const fetchSessionManagerModelName = async () => {
  const { rootManager, unauthorized, isAdmin } =
    await fetchSessionRootManager();
  if (unauthorized) {
    return { unauthorized: true };
  }
  if (isAdmin) {
    return { unauthorized: false, managerModelName: "Admin", isAdmin: true };
  }
  return { managerModelName: rootManager.managerModelName };
};

export const isAuthorizedGeneralManager = cache(async () => {
  const appUser = await fetchSessionAppUser(); // već cache-iran

  if (!appUser) return false;
  const [admin, gm] = await Promise.all([
    isDemoMode() ? null : mongoose.models.Admin.exists({ appUser: appUser._id }),
    mongoose.models.GeneralManager.findOne({
      rootManager: appUser.rootManager,
    })
      .select("generalManagerRequest")
      .populate({ path: "generalManagerRequest", select: "status" })
      .lean(),
  ]);

  return Boolean(
    admin || gm?.generalManagerRequest?.status === ROLE_STATUSES.APPROVED,
  );
});
