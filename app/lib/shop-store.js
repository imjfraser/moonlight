// Owner shop cache with serialized publication and recoverable unsent drafts.
import { getSessionCacheScope, invalidateSessionIdentity, subscribeSession } from "./session";
const KEY = "moonlight.shops.v3";
const DRAFTS = "moonlight.shops.pending.v3";
let cacheScope;
let cache;
let drafts;
const jobs = new Map();
const generations = new Map();
let hydration;
export const getShopCacheScope = () => cacheScope;
function clearMemory() {
  cacheScope = undefined; cache = dictionary(); drafts = dictionary();
  statuses.clear(); generations.clear(); jobs.clear();
}
subscribeSession(() => {
  if (cacheScope && getSessionCacheScope() !== cacheScope) { clearMemory(); emit(null, "ready"); }
});
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
function read(key, storage = "localStorage") {
  try { const value = JSON.parse(window[storage].getItem(key) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? dictionary(value) : dictionary(); } catch { return dictionary(); }
}
function readAll() {
  if (typeof window === "undefined") return dictionary();
  return cache ||= dictionary();
}
function writeAll(all) {
  cache = dictionary(all);
  try { window.localStorage.setItem(`${KEY}:${cacheScope}`, JSON.stringify(all)); } catch {}
}
function pendingDrafts() { return drafts ||= dictionary(); }
function journal() {
  try { window.sessionStorage.setItem(`${DRAFTS}:${cacheScope}`, JSON.stringify(pendingDrafts())); } catch {}
}
function pushShop(handle, shop) {
  pendingDrafts()[handle] = shop;
  journal();
  if (getShopStatus(handle).status !== "failed") void publish(handle);
}
async function publish(handle) {
  if (!cacheScope) return;
  const sendingScope = cacheScope;
  if (jobs.has(handle)) return jobs.get(handle);
  const task = (async () => {
    emit(handle, "saving");
    try {
      while (cacheScope === sendingScope && pendingDrafts()[handle]) {
        const sending = pendingDrafts()[handle];
        const res = await fetch("/api/shops", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle, shop: sending, cacheScope: sendingScope }),
        });
        const result = await res.json();
        if (cacheScope !== sendingScope) return;
        if (!res.ok) {
          if (result.error === "cache_scope_mismatch") { invalidateIdentity(); return; }
          throw new Error(res.status === 409 ? "handle_taken" : res.status === 413 ? "too_large" : res.status === 400 ? "invalid_shop" : "publish_failed");
        }
        if (result.ok !== true) throw new Error("publish_failed");
        changed(handle);
        if (pendingDrafts()[handle] === sending) delete pendingDrafts()[handle];
        journal();
      }
      if (cacheScope === sendingScope) emit(handle, "published");
    } catch (error) { if (cacheScope === sendingScope) emit(handle, "failed", error.message); }
  })();
  jobs.set(handle, task);
  await task;
  if (jobs.get(handle) === task) jobs.delete(handle);
}
function invalidateIdentity() {
  clearMemory();
  emit(null, "failed", "identity_changed");
  invalidateSessionIdentity();
}
export function retryShop(handle) {
  if (pendingDrafts()[handle]) return publish(handle);
  return hydrateShops();
}
export function loadShops() { return readAll(); }
export function loadShop(handle) { return own(readAll(), handle) || null; }
export function saveShop(handle, shop) {
  if (typeof window === "undefined" || !cacheScope) return null;
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
  const startedSessionScope = getSessionCacheScope();
  try {
    const res = await fetch("/api/shops", { cache: "no-store" });
    if (!res.ok) throw new Error("load_failed");
    const { shops, cacheScope: scope } = await res.json();
    if (!shops || typeof shops !== "object" || Array.isArray(shops) ||
        typeof scope !== "string" || !/^[a-f0-9]{64}$/.test(scope)) throw new Error("load_failed");
    const sessionScope = getSessionCacheScope();
    if (!sessionScope || sessionScope !== startedSessionScope) return;
    if ((sessionScope && sessionScope !== scope) || (cacheScope && cacheScope !== scope)) {
      invalidateIdentity(); return;
    }
    if (!cacheScope) {
      cacheScope = scope;
      cache = dictionary();
      drafts = read(`${DRAFTS}:${scope}`, "sessionStorage");
    }
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
    // No cache-to-server migration: only a deliberate edit/retry publishes.
  } catch {
    emit(null, "failed", "load_failed");
    for (const handle of Object.keys(readAll())) {
      if (!jobs.has(handle) && !pendingDrafts()[handle]) emit(handle, "failed", "load_failed");
    }
  }
}
