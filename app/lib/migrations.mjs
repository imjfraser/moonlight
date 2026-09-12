import { migrateAccounts, verifyAccountsSchema } from "./account-migrations.mjs";
// Version 1 adopts the original schema without rewriting participant data.
export const SCHEMA_VERSION = 2;
const columns = {
  participants: ["id", "display_name", "public_name", "lang", "email", "created_at", "last_active_at"],
  participant_state: ["participant_id", "state_json", "updated_at"],
  shops: ["participant_id", "handle", "shop_json", "updated_at"],
  timeline: ["id", "participant_id", "kind", "summary", "data_json", "created_at"],
};
export function verifySchema(db) {
  for (const [table, expected] of Object.entries(columns)) {
    const actual = db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name);
    if (expected.some(name => !actual.includes(name))) throw new Error(`Unexpected schema for ${table}`);
  }
  for (const [table, index, expected] of [
    ["shops", "shops_participant_idx", ["participant_id"]],
    ["timeline", "timeline_participant_idx", ["participant_id", "created_at"]],
  ]) {
    const indexes = db.prepare(`PRAGMA index_list(${table})`).all();
    const actual = db.prepare(`PRAGMA index_info(${index})`).all().map(row => row.name);
    if (!indexes.some(row => row.name === index) || JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Unexpected schema index ${index}`);
    }
  }
}
export function migrate(db) {
  db.transaction(() => {
    const version = db.pragma("user_version", { simple: true });
    if (version > SCHEMA_VERSION) throw new Error("Database schema is newer than this application");
    if (version < 1) {
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
      verifySchema(db);
      db.pragma("user_version = 1");
    } else {
      verifySchema(db);
    }
    if (version < 2) {
      migrateAccounts(db);
      verifyAccountsSchema(db);
      db.pragma("user_version = 2");
    } else {
      verifyAccountsSchema(db);
    }
  }).immediate();
}
