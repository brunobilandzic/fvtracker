import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { readFile, access } from "node:fs/promises";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { parseEnv } from "node:util";
import mongoose from "mongoose";
import {
  DEMO_METADATA_COLLECTION,
  DEMO_SEED_ID,
  isDedicatedDemoDatabase,
} from "../lib/demoMode.js";

const mocked = process.argv[2] === "--mock-ui";
const configPath = process.env.FVTRACKER_TEST_ENV_FILE ?? ".env.demo-test";
const credentialsPath = process.env.FVTRACKER_TEST_CREDENTIALS ?? ".demo-credentials.json";
const readonlyActions = new Set([
  "find", "listCollections", "listIndexes", "listSearchIndexes", "collStats",
  "dbStats", "dbHash", "killCursors", "changeStream", "planCacheRead",
]);
let client, db, before, server, serverExit;
let stage = "test configuration";

function run(args, env, stdio) {
  return spawn(process.execPath, args, { env, stdio, windowsHide: true });
}

function exitCode(child) {
  return new Promise((resolve) => {
    child.once("error", () => resolve(1));
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function localPort() {
  const socket = createServer();
  await new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", resolve);
  });
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function snapshot(database) {
  const collections = await database.listCollections({}, { nameOnly: true }).toArray();
  const hash = createHash("sha256");
  let documents = 0;
  for (const { name, type } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    if (type === "view") continue;
    hash.update(JSON.stringify({ name, type }) + "\n");
    for await (const document of database.collection(name).find().sort({ _id: 1 })) {
      hash.update(mongoose.mongo.BSON.EJSON.stringify(document, { relaxed: false }) + "\n");
      documents++;
    }
  }
  return { collections: collections.length, documents, digest: hash.digest("hex") };
}

try {
  await access(".next/BUILD_ID");
  let config;
  if (mocked) {
    config = { MONGODB_URI: "mongodb://127.0.0.1:1", DEMO_DB_NAME: "fvtracker_demo_mock" };
  } else {
    config = parseEnv(await readFile(configPath, "utf8"));
    assert(config.DEMO_MODE === "true" && config.MONGODB_URI && isDedicatedDemoDatabase(config.DEMO_DB_NAME ?? ""));

    stage = "read-only demo connection and effective privileges";
    client = new mongoose.mongo.MongoClient(config.MONGODB_URI, {
      dbName: config.DEMO_DB_NAME, serverSelectionTimeoutMS: 6000,
    });
    await client.connect();
    db = client.db(config.DEMO_DB_NAME);
    const { authInfo } = await db.command({ connectionStatus: 1, showPrivileges: true });
    const { authenticatedUsers, authenticatedUserPrivileges: privileges } = authInfo;
    assert(authenticatedUsers.length > 0 && privileges?.length > 0);
    assert(privileges.every(({ actions }) => actions.every(action => readonlyActions.has(action))));
    const canReadDatabase = privileges.some(({ resource, actions }) =>
      resource.db === db.databaseName && resource.collection === "" && actions.includes("find"));
    assert(canReadDatabase, "Expected database-scoped read access");

    stage = "seed marker and baseline snapshot";
    assert(await db.collection(DEMO_METADATA_COLLECTION).findOne(
      { _id: DEMO_SEED_ID, state: "ready" }, { projection: { _id: 1 } }));
    before = await snapshot(db);
    console.log(`Verified read-only demo account. Baseline contains ${before.collections} collections and ${before.documents} documents.`);
  }

  stage = "local demo server";
  const port = await localPort();
  const origin = "http://127.0.0.1:" + port;
  const accounts = mocked ? [] : JSON.parse(await readFile(credentialsPath, "utf8"));
  const passwords = new Map(accounts.map(({ username, password }) => [username, password]));
  const env = {
    ...process.env,
    DEMO_MODE: "true",
    MONGODB_URI: config.MONGODB_URI,
    DEMO_DB_NAME: config.DEMO_DB_NAME,
    AUTH_SECRET: randomBytes(32).toString("base64url"),
    AUTH_URL: origin,
    DEMO_CULTIVATION_PASSWORD: passwords.get("cm") ?? "",
    DEMO_PRODUCTION_PASSWORD: passwords.get("pm") ?? "",
    DEMO_WAREHOUSE_PASSWORD: passwords.get("wm") ?? "",
    DEMO_FINANCIAL_PASSWORD: passwords.get("fm") ?? "",
    DEMO_CULTIVATION_WORKER_PASSWORD: passwords.get("cwe") ?? "",
    DEMO_PRODUCTION_WORKER_PASSWORD: passwords.get("pwe") ?? "",
    DEMO_WAREHOUSE_WORKER_PASSWORD: passwords.get("wwe") ?? "",
    DEMO_FINANCIAL_WORKER_PASSWORD: passwords.get("fwe") ?? "",
    FVTRACKER_TEST_ORIGIN: origin,
    FVTRACKER_TEST_CREDENTIALS: credentialsPath,
    FVTRACKER_TEST_MOCK: mocked ? "true" : "false",
  };
  server = run(["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], env, "ignore");
  serverExit = exitCode(server);
  let ready = false;
  for (let attempt = 0; attempt < 40 && server.exitCode === null; attempt++) {
    try {
      const response = await fetch(origin + "/", { signal: AbortSignal.timeout(1000) });
      ready = response.ok && (await response.text()).includes("Demonstracijski podaci.");
      if (ready) break;
    } catch {
      // The listener may still be starting.
    }
    await delay(250);
  }
  assert(ready, "The local server must serve a build created in demo mode");

  if (mocked) console.log("UI fixtures only. Live sessions, permissions and database checks require the read-only run.");
  stage = "automated tests";
  const suites = ["tests/demo-ui.test.mjs", "tests/demo-role-matrix.test.mjs"];
  if (!mocked) suites.push("tests/demo-security.test.mjs");
  const testEnv = { ...process.env, FVTRACKER_TEST_ORIGIN: origin,
    FVTRACKER_TEST_CREDENTIALS: credentialsPath, FVTRACKER_TEST_MOCK: env.FVTRACKER_TEST_MOCK, DEBUG: "" };
  const pattern = process.env.FVTRACKER_TEST_NAME_PATTERN;
  const testArgs = ["--test", ...(pattern ? ["--test-name-pattern", pattern] : []), ...suites];
  process.exitCode = await exitCode(run(testArgs, testEnv, "inherit"));
} catch (error) {
  const code = typeof error.code === "number" || ["ENOENT", "ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT"].includes(error.code)
    ? ` [${error.code}]` : "";
  console.error(`Demo checks stopped during ${stage}${code}.`);
  if (stage === "test configuration") console.error("Run the production build first and supply the dedicated read-only demo configuration.");
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    server.kill();
    await serverExit;
  }
  if (before) {
    try {
      const after = await snapshot(db);
      assert.deepEqual(after, before);
      console.log(`Database unchanged across ${after.collections} collections and ${after.documents} documents.`);
    } catch {
      console.error("The final database snapshot did not match or could not be read.");
      process.exitCode = 1;
    }
  }
  await client?.close().catch(() => {});
}
