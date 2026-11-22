import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export async function signIn(context, username) {
  const file = process.env.FVTRACKER_TEST_CREDENTIALS ?? ".demo-credentials.json";
  const credentials = JSON.parse(await readFile(file, "utf8"));
  const password = credentials.find(account => account.username === username)?.password;
  assert(password, `Missing seeded account ${username}`);

  let session;
  try {
    const csrf = await context.get("/api/auth/csrf");
    const { csrfToken } = await csrf.json();
    await context.post("/api/auth/callback/credentials", {
      form: { csrfToken, login: username, password },
      headers: { "X-Auth-Return-Redirect": "1" },
    });
    session = await (await context.get("/api/auth/session")).json();
  } catch {
    throw new Error(`Could not establish a session for ${username}`);
  }
  assert.equal(session?.user?.username === username, true, `Login failed for ${username}`);
  return session.user;
}
