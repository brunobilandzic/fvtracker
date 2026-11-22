import { EMPLOYMENT_STATUS_EMPLOYED, EMPLOYMENT_STATUS_PENDING, EMPLOYMENT_STATUS_UNEMPLOYED } from "@/lib/constants/users/workers";
import { protectApi } from "@/lib/auth/protectApi";
import { fetchManager } from "@/lib/auth/fetchSessionData";
import {
  FINANCIAL_MANAGER,
  MANAGER_TYPES,
} from "@/lib/constants/users/managerTypes";
import { EmploymentRequest } from "@/models/user/workers/EmploymentRequest";

async function handleGET(request) {
  const { unauthorized } = await fetchManager({
    managerNames: [FINANCIAL_MANAGER],
  });
  if (unauthorized) {
    return Response.json(
      { error: "Nemate pravo pristupa zahtjevima za zaposlenje" },
      { status: 403 },
    );
  }

  const employmentRequests = await EmploymentRequest.find().populate([
    {
      path: "worker",
      populate: [
        {
          path: "appUser",
          select: "name surname email username",
        },
      ],
    },
  ]);
  return Response.json({ requests: employmentRequests });
}

async function handlePUT(request) {
  const { unauthorized } = await fetchManager({
    managerNames: MANAGER_TYPES,
  });
  if (unauthorized) {
    return Response.json(
      { error: "Nemate pravo pristupa zahtjevima za zaposlenje" },
      { status: 403 },
    );
  }
  const { requestId, status } = await request.json();
  if (![EMPLOYMENT_STATUS_EMPLOYED, EMPLOYMENT_STATUS_PENDING, EMPLOYMENT_STATUS_UNEMPLOYED].includes(status)) {
    return new Response(null, { status: 400 });
  }
  const updated = await EmploymentRequest.findByIdAndUpdate(requestId, { status }, { runValidators: true });
  if (!updated) return new Response(null, { status: 404 });
  return Response.json({ message: "Zahtjev uspješno ažuriran" });
}

export const GET = protectApi(handleGET, ["Admin", "GeneralManager", "FinancialManager"]);
export const PUT = protectApi(handlePUT, ["Admin", "GeneralManager", "FinancialManager"]);
