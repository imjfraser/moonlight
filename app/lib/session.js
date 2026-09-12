// Server identity partitions browser state; legacy unscoped keys stay inert.
// cacheScope is metadata, not a credential. The cookie remains the authority.
const KEY = "moonlight.session.v3";
const JOURNAL = "moonlight.session.pending.v3";
export const defaultSession = {
  intake: { name: "", publicName: "", skills: "", askedFor: "", offerType: "service",
    hoursPerWeek: "5-10", channels: ["WhatsApp"], safetyNotes: "", showRealName: false },
  selectedIdea: null, ideas: null, brief: null, kit: null,
};
let identityEpoch = 0;
let current, revision, pending, cacheScope, hydration, running = false;
let snapshot = { status: "loading", ready: false, error: null };
const listeners = new Set();
export const subscribeSession = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getSessionStatus = () => snapshot;
export const getSessionCacheScope = () => cacheScope;
function emit(status, error = null) {
  snapshot = { status, ready: current !== undefined, error, cacheScope };
  listeners.forEach((fn) => fn());
}
function validScope(value) { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value); }
function read(storage, key) {
  try { return JSON.parse(window[storage].getItem(key) || "null"); } catch { return null; }
}
function cache(state) {
  current = structuredClone(state);
  try { window.localStorage.setItem(`${KEY}:${cacheScope}`, JSON.stringify(state)); } catch {}
}
function journal() {
  if (!cacheScope) return;
  try {
    const key = `${JOURNAL}:${cacheScope}`;
    if (pending) window.sessionStorage.setItem(key, JSON.stringify({ state: pending, baseRevision: revision }));
    else window.sessionStorage.removeItem(key);
  } catch {}
}
// Preserve the old scoped draft on disk, but stop rendering/writing that identity.
export function invalidateSessionIdentity() {
  identityEpoch += 1;
  current = pending = revision = cacheScope = undefined;
  hydration = null;
  emit("failed", "identity_changed");
}
export function loadSession() {
  return { ...structuredClone(defaultSession), ...structuredClone(current || {}) };
}
export function saveSession(state) {
  if (typeof window === "undefined" || !cacheScope || current === undefined) return;
  cache(state);
  pending = structuredClone(state);
  journal();
  if (snapshot.status !== "failed") void flush();
}
export function clearSession() { saveSession({}); }
async function flush() {
  if (running || !cacheScope || !revision || !pending) return;
  running = true;
  const sendingScope = cacheScope;
  emit("saving");
  try {
    while (pending && cacheScope === sendingScope) {
      const sending = pending;
      const res = await fetch("/api/state", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: sending, baseRevision: revision, cacheScope: sendingScope }),
      });
      const result = await res.json();
      if (cacheScope !== sendingScope) return;
      if (!res.ok) {
        if (result.error === "cache_scope_mismatch") { invalidateSessionIdentity(); return; }
        throw new Error(res.status === 409 ? "conflict" : "save_failed");
      }
      if (typeof result.revision !== "string") throw new Error("save_failed");
      revision = result.revision;
      if (pending === sending) pending = null;
      journal();
    }
    if (cacheScope === sendingScope) emit("saved");
  } catch (error) {
    if (cacheScope === sendingScope) { journal(); emit("failed", error.message); }
  } finally { running = false; }
}
export async function hydrateSession() {
  if (typeof window === "undefined" || snapshot.error === "identity_changed") return;
  if (hydration) return hydration;
  const startedEpoch = identityEpoch;
  hydration = (async () => {
    emit("loading");
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (identityEpoch !== startedEpoch) return;
      if (!res.ok) throw new Error("load_failed");
      const result = await res.json();
      if (identityEpoch !== startedEpoch) return;
      if (!validScope(result.cacheScope) || typeof result.revision !== "string") throw new Error("load_failed");
      cacheScope = result.cacheScope;
      revision = result.revision;
      pending = undefined;
      const saved = read("sessionStorage", `${JOURNAL}:${cacheScope}`);
      if (saved && saved.state && typeof saved.baseRevision === "string") {
        cache(saved.state);
        pending = saved.state;
        revision = saved.baseRevision;
        if (revision !== result.revision) { emit("failed", "conflict"); return; }
      } else {
        // Server is authoritative; never adopt an unbound browser cache.
        cache(result.state ?? {});
      }
      emit("ready");
      if (pending) { journal(); await flush(); }
    } catch {
      if (identityEpoch !== startedEpoch) return;
      emit("failed", "load_failed");
      hydration = null;
    }
  })();
  return hydration;
}
export async function retrySession() {
  if (snapshot.error === "conflict") return;
  // Re-bootstrap both stores together after a confirmed identity change.
  if (snapshot.error === "identity_changed") { window.location.reload(); return; }
  if (!revision || snapshot.error === "load_failed") { hydration = null; return hydrateSession(); }
  return flush();
}
export async function discardDraftAndReload() {
  try {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error("load_failed");
    const result = await res.json();
    if (typeof result.revision !== "string" || !validScope(result.cacheScope)) throw new Error("load_failed");
    if (result.cacheScope !== cacheScope) { invalidateSessionIdentity(); return; }
    cache(result.state ?? {}); revision = result.revision;
    pending = null; journal();
    window.location.reload();
  } catch { emit("failed", "conflict"); }
}
export function downloadSessionDraft() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(current ?? {}, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = "moonlight-unsaved-draft.json"; a.click();
  URL.revokeObjectURL(url);
}
