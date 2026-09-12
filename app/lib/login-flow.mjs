export function authPaths(admin = false) {
  return { base: admin ? "/api/admin/auth" : "/api/auth", destination: admin ? "/admin" : "/architect" };
}
export function consumeAuthFragment(location, history) {
  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  if (!params.has("token")) return null;
  const values = params.getAll("token");
  // Remove sensitive link material before any fetch or client navigation.
  history.replaceState(null, "", location.pathname + location.search);
  if (values.length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(values[0])) throw new Error("invalid_token");
  return values[0];
}
const ERRORS = new Set(["invalid_email","invalid_token","rate_limited","email_unavailable","invalid_request","origin_not_allowed"]);
export async function authPost(admin, action, payload, fetcher = fetch, signal) {
  if (!["request","verify"].includes(action)) throw new Error("invalid_request");
  let response;
  try {
    response = await fetcher(authPaths(admin).base + "/" + action, {
      method: "POST", credentials: "same-origin", cache: "no-store", signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("network_error");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(ERRORS.has(body.error) ? body.error : "request_failed");
    error.retryAfter = Math.max(1, Math.min(3600, Number(response.headers.get("Retry-After")) || 60));
    throw error;
  }
  if (action === "verify" ? body.authenticated !== true : body.sent !== true) throw new Error("request_failed");
  // Destination is fixed locally; never trust a redirect supplied by a response.
  return action === "verify" ? { destination: authPaths(admin).destination } : { sent: true };
}
