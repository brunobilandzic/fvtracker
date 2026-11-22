import mongoose from "mongoose";
import {
  DEMO_METADATA_COLLECTION,
  DEMO_SEED_ID,
  isDedicatedDemoDatabase,
  isDemoMode,
} from "../demoMode.js";

const cached = globalThis.fvtrackerMongoose ??= { promise: null };

export default async function dbConnect({ seedDatabase, seedUri } = {}) {
  if (!cached.promise) {
    cached.promise = connect({ seedDatabase, seedUri }).catch(async () => {
      try {
        await mongoose.disconnect();
      } catch {
        // A failed connection can already be closed.
      }
      cached.promise = null;
      throw new Error("Database unavailable");
    });
  }
  return cached.promise;
}

async function connect({ seedDatabase, seedUri }) {
  const uri = seedUri ?? process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing database configuration");

  const demo = !seedDatabase && isDemoMode();
  if (!seedDatabase && (process.env.VERCEL || process.env.VERCEL_ENV) && !demo) {
    throw new Error("Vercel requires demo mode");
  }
  const dbName = seedDatabase || (demo ? process.env.DEMO_DB_NAME : undefined);
  if ((demo || seedDatabase) && !isDedicatedDemoDatabase(dbName ?? "")) {
    throw new Error("Invalid demo database configuration");
  }

  await mongoose.connect(uri, {
    ...(dbName ? { dbName } : {}),
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
    ...(demo || seedDatabase ? { autoIndex: false, autoCreate: false } : {}),
  });

  if (demo) {
    const ready = await mongoose.connection.db
      .collection(DEMO_METADATA_COLLECTION)
      .findOne({ _id: DEMO_SEED_ID, state: "ready" }, { projection: { _id: 1 } });
    if (!ready) throw new Error("Demo database has not been initialized");
  }
  return mongoose;
}
