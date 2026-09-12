import { markVaultDirty } from "./vault-sync.mjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const tokenHash = token => createHash("sha256").update(token).digest("hex");
export const validToken = token => typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
export function normalizeEmail(value) {
  if (typeof value !== "string") throw new Error("invalid_email");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error("invalid_email");
  return email;
}
const validAudience = audience => audience === "user" || audience === "admin";
const SELECT_ACCOUNT = `SELECT a.*, p.display_name FROM accounts a JOIN participants p ON p.id=a.participant_id`;
export function accountView(row) {
  return row ? { id: row.participant_id, email: row.email, role: row.role, status: row.status,
    enrollmentTier: row.enrollment_tier, displayName: row.display_name || null,
    createdAt: row.created_at, updatedAt: row.updated_at } : null;
}
export function issueMagicLink(db, emailValue, audience = "user", now = Date.now()) {
  const email = normalizeEmail(emailValue);
  if (!validAudience(audience)) throw new Error("invalid_audience");
  return db.transaction(() => {
    const account = db.prepare("SELECT * FROM accounts WHERE email=?").get(email);
    if ((account && (account.status !== "active" || account.role !== audience)) || (!account && audience === "admin")) return null;
    // One live link per address/audience; never store the bearer token itself.
    db.prepare("UPDATE auth_magic_links SET consumed_at=? WHERE email=? AND audience=? AND consumed_at IS NULL").run(now,email,audience);
    db.prepare("DELETE FROM auth_magic_links WHERE expires_at < ?").run(now - 24 * 60 * 60 * 1000);
    const token = randomBytes(32).toString("base64url");
    db.prepare("INSERT INTO auth_magic_links(token_hash,email,audience,created_at,expires_at) VALUES(?,?,?,?,?)")
      .run(tokenHash(token),email,audience,now,now+MAGIC_LINK_TTL_MS);
    return token;
  }).immediate();
}
export function revokeMagicLink(db, token, now = Date.now()) {
  if (validToken(token)) db.prepare("UPDATE auth_magic_links SET consumed_at=? WHERE token_hash=?").run(now,tokenHash(token));
}
export function consumeMagicLink(db, token, audience = "user", now = Date.now()) {
  if (!validToken(token) || !validAudience(audience)) return null;
  return db.transaction(() => {
    const link = db.prepare(`UPDATE auth_magic_links SET consumed_at=?
      WHERE token_hash=? AND audience=? AND consumed_at IS NULL AND expires_at>?
      RETURNING email`).get(now,tokenHash(token),audience,now);
    if (!link) return null;
    let account = db.prepare(SELECT_ACCOUNT+" WHERE a.email=?").get(link.email);
    if (account && (account.status !== "active" || account.role !== audience)) return null;
    if (!account) {
      if (audience !== "user") return null;
      const id = randomUUID();
      db.prepare("INSERT INTO participants(id,email) VALUES(?,?)").run(id,link.email);
      db.prepare("INSERT INTO accounts(participant_id,email,role,email_verified_at) VALUES(?,?,'user',?)")
        .run(id,link.email,new Date(now).toISOString());
      markVaultDirty(db,id);
      account = db.prepare(SELECT_ACCOUNT+" WHERE a.participant_id=?").get(id);
    }
    if (!account.email_verified_at) {
      db.prepare("UPDATE accounts SET email_verified_at=?,updated_at=? WHERE participant_id=?")
        .run(new Date(now).toISOString(),new Date(now).toISOString(),account.participant_id);
      markVaultDirty(db,account.participant_id);
    }
    const sessionToken = randomBytes(32).toString("base64url");
    db.prepare("INSERT INTO auth_sessions(token_hash,participant_id,audience,created_at,expires_at) VALUES(?,?,?,?,?)")
      .run(tokenHash(sessionToken),account.participant_id,audience,now,now+SESSION_TTL_MS);
    return { account: accountView(account), sessionToken };
  }).immediate();
}
export function findSessionAccount(db, token, audience = "user", now = Date.now()) {
  if (!validToken(token) || !validAudience(audience)) return null;
  return accountView(db.prepare(`SELECT a.*,p.display_name FROM auth_sessions s
    JOIN accounts a ON a.participant_id=s.participant_id JOIN participants p ON p.id=a.participant_id
    WHERE s.token_hash=? AND s.audience=? AND s.revoked_at IS NULL AND s.expires_at>?
      AND a.status='active' AND a.role=?`).get(tokenHash(token),audience,now,audience));
}
export function revokeSession(db, token, audience = "user", now = Date.now()) {
  if (validToken(token)) db.prepare("UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND audience=?").run(now,tokenHash(token),audience);
}
export function setAccountStatus(db, id, status, now = Date.now()) {
  if (!["active","disabled"].includes(status)) throw new Error("invalid_status");
  return db.transaction(() => {
    const account = db.prepare("SELECT email,status FROM accounts WHERE participant_id=? AND role='user'").get(id);
    if (!account) return null;
    db.prepare("UPDATE accounts SET status=?,updated_at=? WHERE participant_id=? AND role='user'")
      .run(status,new Date(now).toISOString(),id);
    if (account.status !== status) markVaultDirty(db,id);
    if (status === "disabled") {
      db.prepare("UPDATE auth_sessions SET revoked_at=? WHERE participant_id=? AND revoked_at IS NULL").run(now,id);
      db.prepare("UPDATE auth_magic_links SET consumed_at=? WHERE email=? AND consumed_at IS NULL").run(now,account.email);
    }
    return accountView(db.prepare(SELECT_ACCOUNT+" WHERE a.participant_id=?").get(id));
  }).immediate();
}
// Controlled local provisioning only. No HTTP endpoint grants administrator roles.
export function provisionAdmin(db, emailValue, now = Date.now(), { promoteExisting = false } = {}) {
  const email = normalizeEmail(emailValue);
  return db.transaction(() => {
    const existing = db.prepare("SELECT * FROM accounts WHERE email=?").get(email);
    if (existing && existing.role !== "admin") {
      if (!promoteExisting) throw new Error("existing_participant_cannot_be_promoted_implicitly");
      db.prepare("UPDATE accounts SET role='admin',status='active',updated_at=? WHERE participant_id=?")
        .run(new Date(now).toISOString(),existing.participant_id);
      db.prepare("UPDATE auth_sessions SET revoked_at=? WHERE participant_id=? AND revoked_at IS NULL").run(now,existing.participant_id);
      db.prepare("UPDATE auth_magic_links SET consumed_at=? WHERE email=? AND consumed_at IS NULL").run(now,email);
    }
    if (existing) return accountView(db.prepare(SELECT_ACCOUNT+" WHERE a.participant_id=?").get(existing.participant_id));
    const id = randomUUID();
    db.prepare("INSERT INTO participants(id,email) VALUES(?,?)").run(id,email);
    db.prepare("INSERT INTO accounts(participant_id,email,role,email_verified_at) VALUES(?,?,'admin',NULL)")
      .run(id,email);
    return accountView(db.prepare(SELECT_ACCOUNT+" WHERE a.participant_id=?").get(id));
  }).immediate();
}
