// Resolves the current participant from a durable first-party cookie.
// No login yet: the cookie IS the identity for this demo. The schema keeps an
// `email` column so email magic-link accounts (the Pegasus pattern) can be added
// later without a data migration. Called only from server route handlers.

import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";

const COOKIE = "ll_pid";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Returns the participant id, creating the participant (and cookie) on first
// visit. Also refreshes the cookie and last_active_at on return visits.
export async function resolveParticipant() {
  const store = await cookies();
  const db = getDb();
  let id = store.get(COOKIE)?.value || null;

  let valid = false;
  if (id) {
    valid = !!db.prepare("SELECT id FROM participants WHERE id = ?").get(id);
  }
  if (!valid) {
    id = randomUUID();
    db.prepare("INSERT INTO participants (id) VALUES (?)").run(id);
  } else {
    db.prepare("UPDATE participants SET last_active_at = datetime('now') WHERE id = ?").run(id);
  }

  store.set(COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return id;
}

export { participantCacheScope } from "./cache-scope.mjs";
