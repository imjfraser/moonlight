// Owner shop cache with serialized publication and recoverable unsent drafts.
const KEY = "moonlight.shops";
const DRAFTS = "moonlight.shops.pending.v2";
let cache;
let drafts;
const jobs = new Map();
const generations = new Map();
let hydration;
function changed(handle) { generations.set(handle, (generations.get(handle) || 0) + 1); }
const listeners = new Set();
const DEFAULT = { status: "ready", error: null };
let fallback = DEFAULT;
const statuses = new Map();
export function subscribeShops(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getShopStatus(handle) { return statuses.get(handle) || fallback; }
function emit(handle, status, error = null) {
  const value = { status, error };
  if (handle) statuses.set(handle, value); else fallback = value;
  listeners.forEach(fn => fn());
}
function dictionary(value = {}) { return Object.assign(Object.create(null), value); }
function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined; }
function read(key) {
  try { const value = JSON.parse(window.localStorage.getItem(key) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? dictionary(value) : dictionary(); } catch { return dictionary(); }
}
function readAll() {
  if (typeof window === "undefined") return dictionary();
  return cache ||= read(KEY);
}
function writeAll(all) {
  cache = dictionary(all);
  try { window.localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
}
function pendingDrafts() { return drafts ||= read(DRAFTS); }
function journal() {
  try { window.localStorage.setItem(DRAFTS, JSON.stringify(pendingDrafts())); } catch {}
}
function pushShop(handle, shop) {
  pendingDrafts()[handle] = shop;
  journal();
  if (getShopStatus(handle).status !== "failed") void publish(handle);
}
async function publish(handle) {
  if (jobs.has(handle)) return jobs.get(handle);
  const task = (async () => {
    emit(handle, "saving");
    try {
      while (pendingDrafts()[handle]) {
        const sending = pendingDrafts()[handle];
        const res = await fetch("/api/shops", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle, shop: sending }),
        });
        if (!res.ok) {
          throw new Error(res.status === 409 ? "handle_taken" : res.status === 413 ? "too_large" : res.status === 400 ? "invalid_shop" : "publish_failed");
        }
        const result = await res.json();
        if (result.ok !== true) throw new Error("publish_failed");
        changed(handle);
        if (pendingDrafts()[handle] === sending) delete pendingDrafts()[handle];
        journal();
      }
      emit(handle, "published");
    } catch (error) { emit(handle, "failed", error.message); }
  })();
  jobs.set(handle, task);
  await task;
  jobs.delete(handle);
}
export function retryShop(handle) {
  if (pendingDrafts()[handle]) return publish(handle);
  return hydrateShops();
}
export function loadShops() { return readAll(); }
export function loadShop(handle) { return own(readAll(), handle) || null; }
export function saveShop(handle, shop) {
  if (typeof window === "undefined") return;
  const next = { ...shop, handle, updatedAt: new Date().toISOString() };
  changed(handle);
  writeAll({ ...readAll(), [handle]: next });
  pushShop(handle, next);
  return next;
}
export function addSection(handle, section) {
  const shop = loadShop(handle);
  if (!shop) return null;
  const id = section.id || `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return saveShop(handle, { ...shop, sections: [...(shop.sections || []), { ...section, id }] });
}
export function removeSection(handle, sectionId) {
  const shop = loadShop(handle);
  if (!shop) return null;
  return saveShop(handle, { ...shop, sections: (shop.sections || []).filter(s => s.id !== sectionId) });
}
export function updateSection(handle, sectionId, patch) {
  const shop = loadShop(handle);
  if (!shop) return null;
  return saveShop(handle, { ...shop, sections: (shop.sections || []).map(s => s.id === sectionId ? { ...s, ...patch } : s) });
}
export function myHandle() { return Object.keys(readAll())[0] || null; }
export async function hydrateShops() {
  if (typeof window === "undefined") return;
  if (hydration) return hydration;
  hydration = hydrate();
  try { await hydration; } finally { hydration = null; }
}
async function hydrate() {
  const started = new Map(generations);
  try {
    const res = await fetch("/api/shops", { cache: "no-store" });
    if (!res.ok) throw new Error("load_failed");
    const { shops } = await res.json();
    if (!shops || typeof shops !== "object" || Array.isArray(shops)) throw new Error("load_failed");
    const local = readAll();
    const safe = dictionary();
    for (const [handle, shop] of Object.entries(shops)) {
      if ((generations.get(handle) || 0) === (started.get(handle) || 0) && !jobs.has(handle) && !pendingDrafts()[handle]) safe[handle] = shop;
    }
    writeAll({ ...local, ...safe, ...pendingDrafts() });
    emit(null, "ready");
    for (const handle of Object.keys(safe)) emit(handle, "published");
    for (const handle of Object.keys(pendingDrafts())) {
      if (!jobs.has(handle)) emit(handle, "failed", "unsent_draft");
    }
    for (const [handle, shop] of Object.entries(local)) {
      if (!own(shops, handle) && !pendingDrafts()[handle] && !jobs.has(handle) && (generations.get(handle) || 0) === (started.get(handle) || 0)) {
        emit(handle, "ready"); pushShop(handle, shop);
      }
    }
  } catch {
    emit(null, "failed", "load_failed");
    for (const handle of Object.keys(readAll())) {
      if (!jobs.has(handle) && !pendingDrafts()[handle]) emit(handle, "failed", "load_failed");
    }
  }
}
