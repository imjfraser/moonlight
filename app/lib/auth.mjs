import { cookies } from "next/headers";
import { getDb } from "./db.js";
import { findSessionAccount, SESSION_TTL_MS } from "./account-store.mjs";
export const AUTH_COOKIES = { user: "__Host-ll_session", admin: "__Host-ll_admin_session" };
export class AuthError extends Error {
  constructor(code = "not_authenticated", status = 401) { super(code); this.code = code; this.status = status; }
}
export function authOrigin() {
  const url = new URL(process.env.MOONLIGHT_APP_ORIGIN || "https://luzdeluna.app");
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("invalid_auth_origin");
  return url.origin;
}
export function requireSameOrigin(req) {
  const origin = req.headers.get("origin");
  if (origin !== authOrigin()) throw new AuthError("origin_not_allowed",403);
}
export async function getAuthenticatedAccount(audience = "user") {
  const store = await cookies();
  const token = store.get(AUTH_COOKIES[audience])?.value;
  const db = getDb();
  const account = findSessionAccount(db,token,audience);
  if (account) db.prepare("UPDATE participants SET last_active_at=datetime('now') WHERE id=? AND last_active_at < datetime('now','-1 minute')").run(account.id);
  return account;
}
export async function requireUser() {
  const account = await getAuthenticatedAccount("user");
  if (!account) throw new AuthError();
  return account;
}
export async function requireAdmin() {
  const account = await getAuthenticatedAccount("admin");
  if (!account) throw new AuthError("admin_authentication_required",401);
  return account;
}
export function authErrorResponse(error) {
  return Response.json({ error: error instanceof AuthError ? error.code : "internal_error" },
    { status: error instanceof AuthError ? error.status : 500, headers: { "Cache-Control":"no-store" } });
}
export function setSessionCookie(response, token, audience) {
  response.cookies.set(AUTH_COOKIES[audience],token,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:SESSION_TTL_MS/1000});
}
export function clearSessionCookie(response,audience) {
  response.cookies.set(AUTH_COOKIES[audience],"",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});
}
export function withUser(handler) {
  return async function authenticatedHandler(req,...args) {
    try {
      await requireUser();
      if (req && !["GET","HEAD"].includes(req.method)) requireSameOrigin(req);
      return await handler(req,...args);
    } catch(error) { return authErrorResponse(error); }
  };
}
