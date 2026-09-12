// Server-side SQLite persistence for Luz de Luna (Moonlight).
// One embedded database file, no external DB server — sized for Bucket 3.
// Mirrors the Pegasus companion's per-user relational shape:
//   participants (canonical identity) -> participant_state / shops / timeline,
// all isolated by participant_id. Structured state + a narrative timeline,
// echoing the two-layer memory model used for the operator agents.

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { migrate } from "./migrations.mjs";

let _db = null;

export function getDb() {
  if (_db) return _db;
  const dir = process.env.MOONLIGHT_DATA_DIR || path.join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "moonlight.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  try {
    migrate(db);
  } catch (error) {
    db.close();
    throw error;
  }
  _db = db;
  return db;
}
