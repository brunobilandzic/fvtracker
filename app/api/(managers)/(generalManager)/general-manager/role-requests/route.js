import { protectApi } from "@/lib/auth/protectApi";
import {
  fetchAdmin,
  fetchSessionSpecificManager,
} from "@/lib/auth/fetchSessionData";
import { ROLE_STATUSES } from "@/lib/constants/users";
import { GENERAL_MANAGER } from "@/lib/constants/users/managerTypes";
import { RoleRequest } from "@/models/documents/requests/RoleRequest";

async function handlePUT(req) {
  // do not mix req response with Next.js Response object
  try {
    const { admin } = await fetchAdmin();
    const manager = admin ? null : await fetchSessionSpecificManager({ managerName: GENERAL_MANAGER });
    const { requestId, response } = await req.json();
    if (!Object.values(ROLE_STATUSES).includes(response)) return new Response(null, { status: 400 });
    const roleRequest = await RoleRequest.findOne({ _id: requestId, ...(manager && { generalManager: manager._id }) });
    if (!roleRequest) {
      return Response.json(
        { error: "Zahtjev nije pronađen." },
        { status: 404 },
      );
    }
    await roleRequest.populate("rootManager", "managerModelName");
    const roleRequests = await RoleRequest.find().populate(
      "rootManager",
      "managerModelName",
    );
    const someApprovedRequest = roleRequests.some(
      (rr) =>
        rr.rootManager.managerModelName ===
          roleRequest.rootManager.managerModelName &&
        rr.status === ROLE_STATUSES.APPROVED &&
        response === ROLE_STATUSES.APPROVED,
    );
    if (someApprovedRequest) {
      return Response.json(
        {
          error: `Menadžer ${roleRequest.rootManager.managerModelName} s odobrenom ulogom već postoji.`,
        },
        { status: 400 },
      );
    }
    await RoleRequest.updateOne(
      { _id: requestId },
      { status: response, respondedAt: new Date() },
      { runValidators: true },
    );
    return Response.json(
      { message: `Role request status updated to ${response}` },
      { status: 200 },
    );
  } catch {
    return Response.json(
      { error: "Error processing role request." },
      { status: 500 },
    );
  }
}

export const PUT = protectApi(handlePUT, ["Admin", "GeneralManager"]);
