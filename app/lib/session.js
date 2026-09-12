// Unified participant memory. Serialized writes use server-issued revisions.
// A per-tab journal retains unsaved work across reloads without overwriting it.
const KEY = "moonlight.session.v1";
const JOURNAL = "moonlight.session.pending.v2";
export const defaultSession = {
  intake: { name: "", publicName: "", skills: "", askedFor: "", offerType: "service",
    hoursPerWeek: "5-10", channels: ["WhatsApp"], safetyNotes: "", showRealName: false },
  selectedIdea: null, ideas: null, brief: null, kit: null,
};
let current, revision, pending, hydration, running = false;
let snapshot = { status: "loading", ready: false, error: null };
const listeners = new Set();
export const subscribeSession = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getSessionStatus = () => snapshot;
function emit(status, error = null) {
  snapshot = { status, ready: current !== undefined, error };
  listeners.forEach((fn) => fn());
}
function read(storage, key) {
  try { return JSON.parse(window[storage].getItem(key) || "null"); } catch { return null; }
}
function cache(state) {
  current = structuredClone(state);
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
function journal() {
  try {
    if (pending) window.sessionStorage.setItem(JOURNAL, JSON.stringify({ state: pending, baseRevision: revision }));
    else window.sessionStorage.removeItem(JOURNAL);
  } catch {}
}
export function loadSession() {
  const state = current ?? (typeof window !== "undefined" ? read("localStorage", KEY) : null);
  return { ...structuredClone(defaultSession), ...structuredClone(state || {}) };
}
export function saveSession(state) {
  if (typeof window === "undefined") return;
  cache(state);
  pending = structuredClone(state);
  journal();
  if (snapshot.status !== "failed") void flush();
}
export function clearSession() { saveSession({}); }
async function flush() {
  if (running || !revision || !pending) return;
  running = true;
  emit("saving");
  try {
    while (pending) {
      const sending = pending;
      const res = await fetch("/api/state", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: sending, baseRevision: revision }),
      });
      if (!res.ok) throw new Error(res.status === 409 ? "conflict" : "save_failed");
      const result = await res.json();
      if (typeof result.revision !== "string") throw new Error("save_failed");
      revision = result.revision;
      if (pending === sending) pending = null;
      journal();
    }
    emit("saved");
  } catch (error) {
    journal();
    emit("failed", error.message);
  } finally { running = false; }
}
export async function hydrateSession() {
  if (typeof window === "undefined") return;
  if (hydration) return hydration;
  hydration = (async () => {
    emit("loading");
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error("load_failed");
      const result = await res.json();
      if (typeof result.revision !== "string") throw new Error("load_failed");
      const saved = read("sessionStorage", JOURNAL);
      revision = result.revision;
      if (saved && saved.state && typeof saved.baseRevision === "string") {
        cache(saved.state);
        pending = saved.state;
        revision = saved.baseRevision;
        if (revision !== result.revision) { emit("failed", "conflict"); return; }
      } else {
        const legacy = read("localStorage", KEY);
        cache(result.state ?? legacy ?? {});
        if (result.state === null && legacy) pending = legacy;
      }
      emit("ready");
      if (pending) { journal(); await flush(); }
    } catch {
      emit("failed", "load_failed");
      hydration = null;
    }
  })();
  return hydration;
}
export async function retrySession() {
  if (snapshot.error === "conflict") return;
  if (!revision || snapshot.error === "load_failed") { hydration = null; return hydrateSession(); }
  return flush();
}
// Explicit user action only: never silently adopt a new base after a conflict.
export async function discardDraftAndReload() {
  try {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error("load_failed");
    const result = await res.json();
    if (typeof result.revision !== "string") throw new Error("load_failed");
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
