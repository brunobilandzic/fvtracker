import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { request } from "playwright-core";
import { signIn } from "./demo-session.mjs";

const baseURL = process.env.FVTRACKER_TEST_ORIGIN;
assert(baseURL && new URL(baseURL).hostname === "127.0.0.1", "Use the local read-only demo runner");

const mocked = process.env.FVTRACKER_TEST_MOCK === "true";
const needsDatabase = { skip: mocked ? "requires a read-only demo database" : false };

const activeRoles = [
  ["gm", "GeneralManager", "/api/general-manager", "/api/genman-requests"],
  ["cm", "CultivationManager", "/api/cultivation/fields", "/api/orders"],
  ["pm", "ProductionManager", "/api/facilities", "/api/employment-requests"],
  ["fm", "FinancialManager", "/api/orders", "/api/general-manager"],
  ["wm", "WarehouseManager", "/api/warehouses", "/api/orders"],
  ["cwe", "CultivationWorker", "/api/cultivation/fields", "/api/orders"],
  ["pwe", "ProductionWorker", "/api/productionManager", "/api/workers"],
  ["wwe", "WarehouseWorker", "/api/warehouse-requests", "/api/orders"],
  ["fwe", "FinancialWorker", "/api/orders", "/api/employment-requests"],
];

for (const [account, role, allowed, denied] of activeRoles) {
  test(`${role} has scoped read access`, needsDatabase, async () => {
    const http = await request.newContext({ baseURL });
    try {
      const user = await signIn(http, account);
      assert.equal(user.managerModelName ?? user.workerType, role);
      assert.equal(user.isAdmin, false);
      if (role.endsWith("Worker")) assert.equal(user.employed, true);
      assert.equal((await http.get(allowed)).status(), 200, allowed);
      assert.equal((await http.get(denied)).status(), 403, denied);
    } finally {
      await http.dispose();
    }
  });
}

for (const account of ["cwp", "pwp", "ww", "fw", "cwu", "pwu", "wwu", "fwu"]) {
  test(`Inactive worker ${account} has no worker-record access`, needsDatabase, async () => {
    const http = await request.newContext({ baseURL });
    try {
      const user = await signIn(http, account);
      assert.equal(user.employed, false);
      const query = new URLSearchParams({ workerId: user.workerId });
      assert.equal((await http.get("/api/worker?" + query)).status(), 403);
    } finally {
      await http.dispose();
    }
  });
}

async function writeRoutes(directory, segments = []) {
  const routes = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (segments.length === 0 && entry.name === "auth") continue;
      const next = entry.name.startsWith("(") ? segments : [...segments, entry.name];
      routes.push(...await writeRoutes(path, next));
    } else if (entry.name === "route.js") {
      const source = await readFile(path, "utf8");
      const url = "/api/" + segments.join("/");
      for (const match of source.matchAll(/export\s+(?:const\s+|(?:async\s+)?function\s+)(POST|PUT|PATCH|DELETE)\b/g)) {
        routes.push([url, match[1]]);
      }
    }
  }
  return routes;
}

const routes = await writeRoutes("app/api");
assert(routes.length >= 25, "Expected the business write endpoints to be discovered");
for (const [path, method] of routes) {
  await test(`${method} ${path} rejects unauthorized writes`, async () => {
    // The shared demo guard runs before dispatch and body parsing. Give it an empty payload.
    const anonymous = await request.newContext({ baseURL });
    const manager = mocked ? null : await request.newContext({ baseURL });
    try {
      const maintenance = ["/api/seed", "/api/delete"].includes(path);
      assert.equal((await anonymous.fetch(path, { method })).status(), maintenance ? 404 : 401);
      if (!manager) return;
      await signIn(manager, "gm");
      const blocked = await manager.fetch(path, { method });
      assert.equal(blocked.status(), maintenance ? 404 : 403);
      if (!maintenance) assert.equal((await blocked.json()).error, "Demo mode is read-only");
    } finally {
      await anonymous.dispose();
      await manager?.dispose();
    }
  });
}
