export function migrateAccounts(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      participant_id TEXT PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
      enrollment_tier TEXT NOT NULL DEFAULT 'free',
      email_verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS auth_magic_links (
      token_hash TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      audience TEXT NOT NULL CHECK(audience IN ('user','admin')),
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      consumed_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS auth_magic_links_email_idx ON auth_magic_links(email, audience);
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL REFERENCES accounts(participant_id) ON DELETE CASCADE,
      audience TEXT NOT NULL CHECK(audience IN ('user','admin')),
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS auth_sessions_account_idx ON auth_sessions(participant_id);
  `);
}
export function verifyAccountsSchema(db) {
  for (const [table, expected] of Object.entries({
    accounts: ["participant_id","email","status","role","enrollment_tier","email_verified_at","created_at","updated_at"],
    auth_magic_links: ["token_hash","email","audience","created_at","expires_at","consumed_at"],
    auth_sessions: ["token_hash","participant_id","audience","created_at","expires_at","revoked_at"],
  })) {
    const actual = db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name);
    if (expected.some(column => !actual.includes(column))) throw new Error("Unexpected account schema");
  }
}
