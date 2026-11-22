import mongoose from "mongoose";
import { getCurrentIdentity } from "./fetchSessionData";
import { Field } from "@/models/sectors/cultivation/Field";
import { Cultivation, CultivationArea } from "@/models/sectors/cultivation/Cultivation";
import { Worker } from "@/models/user/workers";
import { EMPLOYMENT_STATUS_EMPLOYED } from "@/lib/constants/users/workers";
import { CultivationManager } from "@/models/user/managers/CultivationManager";

export async function getScopedField(filter) {
  const user = await getCurrentIdentity();
  if (user.isAdmin || user.managerModelName === "GeneralManager") {
    return Field.findOne(filter);
  }
  let managerId = user.managerId;
  if (user.workerType === "CultivationWorker") {
    const manager = await CultivationManager.findOne({ rootManager: user.workerManagerId }).select("_id");
    managerId = manager?._id;
  }
  return managerId ? Field.findOne({ ...filter, manager: managerId }) : null;
}

export async function getScopedArea(id) {
  if (!mongoose.isObjectIdOrHexString(id)) return null;
  const area = await CultivationArea.findById(id);
  return area && await getScopedField({ _id: area.field }) ? area : null;
}

export async function getScopedCultivation(id) {
  if (!mongoose.isObjectIdOrHexString(id)) return null;
  const cultivation = await Cultivation.findById(id);
  return cultivation && await getScopedArea(cultivation.cultivationArea) ? cultivation : null;
}

export async function getAssignableWorker(id, workerType) {
  const user = await getCurrentIdentity();
  if (!mongoose.isObjectIdOrHexString(id) || (user.workerId && user.workerId !== id)) return null;
  const filter = { _id: id, __t: workerType };
  if (user.workerId) filter.appUser = user.appUserId;
  else if (!user.isAdmin && user.managerModelName !== "GeneralManager") filter.manager = user.rootManagerId;
  const worker = await Worker.findOne(filter).populate({ path: "employmentRequest", select: "status" });
  return worker?.employmentRequest?.status === EMPLOYMENT_STATUS_EMPLOYED ? worker : null;
}
