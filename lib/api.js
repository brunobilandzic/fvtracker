import axios, { CanceledError } from "axios";

const api = axios.create({ baseURL: "/api" });

const readMethods = new Set(["get", "head", "options"]);
const demoReadOnly = "ERR_DEMO_READ_ONLY";

export function isDemoWriteBlocked(error) {
  return error?.code === demoReadOnly;
}

export function interceptDemoWrites(notify) {
  const id = api.interceptors.request.use((config) => {
    if (readMethods.has(config.method)) return config;

    notify();
    const error = new CanceledError("Demo mode is read-only");
    error.code = demoReadOnly;
    throw error;
  });
  return () => api.interceptors.request.eject(id);
}

export default api;
