import { auth } from "@/auth";
import { isDemoMode } from "@/lib/demoMode";
import dbConnect from "@/lib/db/mongooseConnect";
import { ROLE_STATUSES } from "@/lib/constants/users";
import { withSessionIdentity } from "./fetchSessionData";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function protectApi(handler, roles = []) {
  return async function protectedHandler(request, context) {
    const read = safeMethods.has(request.method);
    try {
      const session = roles === "public" ? null : await auth();
      const user = session?.user;
      if (roles !== "public" && !user?.appUserId) {
        return failure("Authentication required", 401);
      }
      if (!read && isDemoMode()) return failure("Demo mode is read-only", 403);
      if (!read && !allowsOrigin(request)) {
        return failure("Invalid request origin", 403);
      }

      if (roles !== "public" && roles.length > 0 && !hasRole(user, roles)) {
        return failure("Access denied", 403);
      }

      if (!read && request.body) {
        const contentType = request.headers.get("content-type")?.split(";")[0].trim();
        if (contentType !== "application/json") return failure("JSON body required", 415);
        let body;
        try {
          body = await request.clone().json();
        } catch {
          return failure("Invalid JSON body", 400);
        }
        if (!body || typeof body !== "object" || Array.isArray(body) || hasUnsafeKeys(body)) {
          return failure("Invalid JSON body", 400);
        }
      }

      await dbConnect();
      const response = await withSessionIdentity(user, () => handler(request, context));
      if (!response || response.status >= 500) return failure("Request failed", 500);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch {
      return failure("Request failed", 500);
    }
  };
}

function allowsOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin === null) return true;

  const requestUrl = new URL(request.url);
  const protocol = process.env.VERCEL || process.env.VERCEL_ENV ? "https:" : requestUrl.protocol;
  // Next normalizes the host of request.url on self-hosted servers.
  const host = request.headers.get("host") || requestUrl.host;
  return origin === new URL(protocol + "//" + host).origin;
}

function hasUnsafeKeys(body) {
  const values = [body];
  while (values.length) {
    for (const [key, value] of Object.entries(values.pop())) {
      if (key.startsWith("$") || key.includes(".") || ["__proto__", "constructor", "prototype"].includes(key)) {
        return true;
      }
      if (value && typeof value === "object") values.push(value);
    }
  }
  return false;
}

function hasRole(user, roles) {
  if (user.isAdmin) return roles.includes("Admin");
  if (user.employed && roles.includes(user.workerType)) return true;
  const status = user.managerModelName === "GeneralManager"
    ? user.generalManagerRequest : user.roleStatus;
  return Boolean(user.managerId && status === ROLE_STATUSES.APPROVED &&
    roles.includes(user.managerModelName));
}

function failure(error, status) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
}
