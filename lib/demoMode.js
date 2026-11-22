export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export function registrationEnabled() {
  return !isDemoMode() && process.env.NODE_ENV === "development";
}

export const DEMO_METADATA_COLLECTION = "fvtracker_demo_metadata";
export const DEMO_SEED_ID = "synthetic-v1";

export function isDedicatedDemoDatabase(name) {
  return /^fvtracker_demo_[a-z0-9_-]+$/.test(name);
}
