import { protectApi } from "@/lib/auth/protectApi";

async function handleGET(req) {
  return new Response(JSON.stringify({ message: "User route GET" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET = protectApi(handleGET);
