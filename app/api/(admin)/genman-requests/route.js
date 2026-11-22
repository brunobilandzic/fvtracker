import { protectApi } from "@/lib/auth/protectApi";
import { fetchAdmin } from "@/lib/auth/fetchSessionData";
import { ROLE_STATUSES } from "@/lib/constants/users";
import { GeneralManagerRequest } from "@/models/documents/requests/RoleRequest";
import { GeneralManager } from "@/models/user/managers/GeneralManager";

async function handleGET(request) {
  try {
    const { unauthorized, admin } = await fetchAdmin({
      requireAdmin: true,
    });
    if (unauthorized) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const generalManagerRequests = await GeneralManagerRequest.find(
      {},
    ).populate([
      {
        path: "generalManager",
        populate: {
          path: "rootManager",
          populate: {
            path: "appUser",
            select: "email name surname username",
          },
        },
      },
    ]);

    return Response.json({ generalManagerRequests });
  } catch {
    return Response.json(
      { error: "Greška prilikom dohvatanja zahteva za generalnog menadžera" },
      { status: 500 },
    );
  }
}

async function handlePOST(req) {
  try {
    const { unauthorized, admin } = await fetchAdmin({
      requireAdmin: true,
    });
    if (unauthorized) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    const body = await req.json();
    const { _id, status } = body;
    if (!Object.values(ROLE_STATUSES).includes(status)) return new Response(null, { status: 400 });

    const requests = await GeneralManagerRequest.find();
    if (
      status === ROLE_STATUSES.APPROVED &&
      requests?.some((request) => request.status === ROLE_STATUSES.APPROVED)
    ) {
      return Response.json(
        { error: "Već postoji odobren zahtev za generalnog menadžera" },
        { status: 400 },
      );
    }

    const request = await GeneralManagerRequest.findById(_id);
    if (!request) return new Response(null, { status: 404 });
    request.status = status;

    await request.save();
    return Response.json({ request, message: "Zahtjev odobren" });
  } catch {
    return Response.json(
      { error: "Greška prilikom odobravanja zahteva za generalnog menadžera" },
      { status: 500 },
    );
  }
}

export const GET = protectApi(handleGET, ["Admin"]);
export const POST = protectApi(handlePOST, ["Admin"]);
