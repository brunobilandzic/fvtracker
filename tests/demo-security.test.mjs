import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import test from "node:test";

const origin = process.env.FVTRACKER_TEST_ORIGIN;
if (!origin || !["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname)) {
  throw new Error("Set FVTRACKER_TEST_ORIGIN to a running, seeded loopback demo.");
}
const credentialsFile = process.env.FVTRACKER_TEST_CREDENTIALS || ".demo-credentials.json";
const credentials = new Map(JSON.parse(await readFile(credentialsFile, "utf8"))
  .map(({ username, password }) => [username, password]));

const testRegistrationPassword = randomBytes(24).toString("base64url");

function browser() {
  const cookies = new Map();
  return async (path, options = {}) => {
    const headers = new Headers(options.headers);
    if (cookies.size) {
      headers.set("cookie", [...cookies].map(([key, value]) => key + "=" + value).join("; "));
    }
    const response = await fetch(new URL(path, origin), { ...options, headers, redirect: "manual" });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const at = pair.indexOf("=");
      if (pair.slice(at + 1)) cookies.set(pair.slice(0, at), pair.slice(at + 1));
      else cookies.delete(pair.slice(0, at));
    }
    return response;
  };
}

async function authPost(request, path, fields) {
  const csrf = await request("/api/auth/csrf");
  assert.equal(csrf.status, 200);
  return request(path, {
    method: "POST",
    body: new URLSearchParams({ ...(await csrf.json()), ...fields }),
    headers: { "X-Auth-Return-Redirect": "1" },
  });
}

async function login(username, password = credentials.get(username)) {
  const request = browser();
  const response = await authPost(request, "/api/auth/callback/credentials", { login: username, password });
  const url = new URL((await response.json()).url, origin);
  assert.equal(url.searchParams.has("error"), false, "Demo login should succeed");
  assert.ok(response.headers.getSetCookie().some(cookie =>
    cookie.includes("session-token=") && /; HttpOnly/i.test(cookie) && /; SameSite=Lax/i.test(cookie)));
  return request;
}

async function expectStatus(request, path, status, options) {
  const response = await request(path, options);
  assert.equal(response.status, status, options?.method ? options.method + " " + path : path);
  return response;
}

function assertNoCredentials(payload) {
  const serialized = JSON.stringify(payload);
  assert.equal(/"(password|passwordConfirm|demoAccount|accessToken|refreshToken|sessionToken)"/i.test(serialized), false);
  for (const password of credentials.values()) {
    assert.equal(serialized.includes(password), false, "Response included a credential");
  }
}

test("anonymous business APIs, direct pages, and maintenance routes reject access", async () => {
  const request = browser();
  for (const route of [
    "/api/auth/user", "/api/cultivation/cultivation-area", "/api/cultivation/fields",
    "/api/cultivation/fields/general-manager", "/api/cultivation/harvest/batches",
    "/api/cultivation/plant", "/api/employment-requests", "/api/facilities",
    "/api/general-manager", "/api/genman-requests", "/api/harvesting-batches",
    "/api/managers", "/api/orders", "/api/procurments", "/api/production-manager",
    "/api/productionManager", "/api/products?scope=production", "/api/stocks",
    "/api/warehouse-requests", "/api/warehouses", "/api/worker", "/api/workers",
  ]) await expectStatus(request, route, 401);
  await expectStatus(request, "/api/warehouses", 401, { method: "PUT" });
  await expectStatus(request, "/api/orders", 401, { method: "POST" });
  await expectStatus(request, "/api/seed", 404, { method: "POST" });
  await expectStatus(request, "/api/delete", 404, { method: "DELETE" });
  await expectStatus(request, "/registracija", 404);
  await expectStatus(request, "/otpremnice/unavailable", 404);
  await expectStatus(request, "/proizvodi/uredi/unavailable", 404);

  const catalog = await expectStatus(request, "/api/products", 200);
  const { products } = await catalog.json();
  assert.ok(products.length > 0);
  for (const product of products) {
    assert.ok(Object.keys(product).every(key =>
      ["_id", "name", "slug", "description", "price", "ingredients"].includes(key)));
    assertNoCredentials(product);
  }
});

test("credentials login and logout maintain a private session", async () => {
  const request = await login("wm");
  const response = await expectStatus(request, "/api/auth/session", 200);
  const session = await response.json();
  assert.equal(session.user.managerModelName, "WarehouseManager");
  assert.equal(session.user.isAdmin, false);
  assertNoCredentials(session);
  const { csrfToken } = await (await request("/api/auth/csrf")).json();
  await expectStatus(request, "/api/auth/session", 200, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csrfToken, data: { user: { isAdmin: true, managerModelName: "GeneralManager" } } }),
  });
  const current = await (await request("/api/auth/session")).json();
  assert.equal(current.user.managerModelName, "WarehouseManager");
  assert.equal(current.user.isAdmin, false);
  await authPost(request, "/api/auth/signout", {});
  await expectStatus(request, "/api/warehouses", 401);
});

test("wrong credentials and direct registration attempts do not create sessions", async () => {
  for (const fields of [
    { login: "wm", password: randomBytes(24).toString("base64url") },
    { isSignUp: "true", requestedRole: "GeneralManager", username: "blocked-registration",
      email: "blocked-registration@example.com", name: "Blocked", surname: "Registration",
      password: testRegistrationPassword, passwordConfirm: testRegistrationPassword },
  ]) {
    const request = browser();
    const response = await authPost(request, "/api/auth/callback/credentials", fields);
    const url = new URL((await response.json()).url, origin);
    assert.equal(url.searchParams.get("error"), "CredentialsSignin");
    await expectStatus(request, "/api/auth/user", 401);
  }
});

test("manager reads are scoped and demo writes, uploads, seed and delete stay blocked", async () => {
  const request = await login("wm");
  const response = await expectStatus(request, "/api/warehouses", 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const before = await response.json();
  assert.ok(before.warehouses.length > 0);
  assertNoCredentials(before);
  await expectStatus(request, "/api/orders", 403);
  await expectStatus(request, "/api/genman-requests", 403);
  await expectStatus(request, "/api/general-manager", 403);
  await expectStatus(request, "/api/warehouses", 403,
    { method: "POST", body: new FormData() });
  for (const method of ["PUT", "DELETE"]) {
    await expectStatus(request, "/api/warehouses", 403, { method });
  }
  await expectStatus(request, "/api/orders", 403, { method: "POST" });
  await expectStatus(request, "/api/seed", 404, { method: "POST" });
  await expectStatus(request, "/api/delete", 404, { method: "DELETE" });
  const after = await (await expectStatus(request, "/api/warehouses", 200)).json();
  assert.deepEqual(after, before);
});

test("demo roles can read the workflows and workers can only read their own profile", async () => {
  const general = await login("gm");
  const finance = await login("fm");
  const warehouse = await login("wwe");
  const pending = await login("ww");
  const production = await login("pm");
  const cultivation = await login("cm");
  for (const [request, path] of [
    [general, "/api/general-manager"], [general, "/api/procurments"],
    [general, "/api/workers"], [finance, "/api/orders"], [finance, "/api/employment-requests"],
    [warehouse, "/api/warehouse-requests"], [production, "/api/stocks"],
    [production, "/api/facilities"], [production, "/api/productionManager"],
    [production, "/api/harvesting-batches"], [cultivation, "/api/cultivation/fields"],
    [cultivation, "/api/cultivation/plant"],
  ]) assertNoCredentials(await (await expectStatus(request, path, 200)).json());
  await expectStatus(pending, "/api/warehouses", 403);
  const self = (await (await warehouse("/api/auth/session")).json()).user;
  const other = (await (await pending("/api/auth/session")).json()).user;
  await expectStatus(warehouse, "/api/worker?workerId=" + self.workerId, 200);
  await expectStatus(warehouse, "/api/worker?workerId=" + other.workerId, 404);

  const malformed = await expectStatus(general, "/api/warehouses?id=invalid-id", 500);
  assert.deepEqual(await malformed.json(), { error: "Request failed" });
});

test("captured server logs exclude demo credentials", { skip: !process.env.FVTRACKER_TEST_LOG }, async () => {
  const output = await readFile(process.env.FVTRACKER_TEST_LOG, "utf8");
  for (const password of credentials.values()) {
    assert.equal(output.includes(password), false, "Server logged a demo credential");
  }
  assert.equal(output.includes(testRegistrationPassword), false, "Server logged registration credentials");
});
