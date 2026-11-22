import { writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dbConnect from "../lib/db/mongooseConnect.js";
import {
  DEMO_METADATA_COLLECTION,
  DEMO_SEED_ID,
  isDedicatedDemoDatabase,
} from "../lib/demoMode.js";

const output = new URL("../.demo-credentials.json", import.meta.url);

class SeedSetupError extends Error {}

async function initialize() {
  const { DEMO_DB_NAME: dbName, DEMO_SEED_MONGODB_URI: uri } = process.env;
  const developmentAdmin = process.argv[3] === "--development-admin";
  if ((process.argv.length > 3 && !developmentAdmin) || process.argv.length > 4 ||
      process.env.VERCEL || process.env.VERCEL_ENV || process.env.NODE_ENV === "production" ||
      !uri || !isDedicatedDemoDatabase(dbName ?? "") || process.argv[2] !== dbName) {
    throw new SeedSetupError("Supply the dedicated database name and seed URI using the local seed configuration.");
  }

  await dbConnect({ seedDatabase: dbName, seedUri: uri });
  const db = mongoose.connection.db;
  if ((await db.listCollections({}, { nameOnly: true }).toArray()).length > 0) {
    throw new SeedSetupError("The target database must be empty.");
  }

  const { default: users, workersJson } = await import("../seed/data/appUsers.js");
  const credentials = [...users, ...workersJson]
    .filter(({ username }) => developmentAdmin || username !== "admin")
    .map(({ username }) => ({ username, password: randomBytes(24).toString("base64url") }));

  await writeFile(output, JSON.stringify(credentials, null, 2) + "\n", {
    flag: "wx", mode: 0o600,
  }).catch(() => {
    throw new SeedSetupError("Could not create the local credentials file. Preserve or move any existing file.");
  });

  const metadata = db.collection(DEMO_METADATA_COLLECTION);
  try {
    await metadata.insertOne({ _id: DEMO_SEED_ID, state: "initializing" });
    const passwords = new Map();
    for (const { username, password } of credentials) {
      passwords.set(username, await bcrypt.hash(password, 12));
    }
    const { seedDemoData } = await import("../seed/index.js");
    await seedDemoData(passwords);
    for (const model of Object.values(mongoose.models)) {
      if (model.schema.indexes().length) await model.createIndexes();
    }
    await metadata.updateOne({ _id: DEMO_SEED_ID }, { $set: { state: "ready" } });
  } catch {
    throw new SeedSetupError("Initialization did not complete. Use a new empty database for the next attempt.");
  }

  console.log("Synthetic data initialized. Credentials are in .demo-credentials.json.");
}

try {
  await initialize();
} catch (error) {
  // Driver errors can contain connection details and seed errors can contain data.
  console.error(error instanceof SeedSetupError ? error.message :
    "Demo initialization failed. Check the local MongoDB configuration and initializer permissions.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
