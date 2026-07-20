// Server-side SQLite persistence for Luz de Luna (Moonlight).
// One embedded database file, no external DB server — sized for Bucket 3.
// Mirrors the Pegasus companion's per-user relational shape:
//   participants (canonical identity) -> participant_state / shops / timeline,
// all isolated by participant_id. Structured state + a narrative timeline,
// echoing the two-layer memory model used for the operator agents.

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

let _db = null;

export function getDb() {
  if (_db) return _db;
  const dir = process.env.MOONLIGHT_DATA_DIR || path.join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "moonlight.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  _db = db;
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id             TEXT PRIMARY KEY,
      display_name   TEXT,
      public_name    TEXT,
      lang           TEXT,
      email          TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS participant_state (
      participant_id TEXT PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
      state_json     TEXT NOT NULL DEFAULT '{}',
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shops (
      participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      handle         TEXT PRIMARY KEY,
      shop_json      TEXT NOT NULL,
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS shops_participant_idx ON shops (participant_id);

    CREATE TABLE IF NOT EXISTS timeline (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      kind           TEXT NOT NULL,
      summary        TEXT,
      data_json      TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS timeline_participant_idx ON timeline (participant_id, created_at);
  `);
}
