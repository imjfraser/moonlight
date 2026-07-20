// Shop records for Luz de Luna.
//
// Durable store is server-side SQLite (see /api/shops). The browser keeps a
// synchronous localStorage cache so the builder/editor can read & write without
// awaiting; every write is pushed through to the server. Public shop pages read
// straight from the server by handle (see /shop/[handle]) so shared links work
// on any device. Same three-function seam as before — callers are unchanged.

const KEY = "moonlight.shops";

function readAll() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(all) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

function pushShop(handle, shop) {
  try {
    fetch("/api/shops", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, shop }),
    }).catch(() => {});
  } catch {}
}

export function loadShops() {
  return readAll();
}

export function loadShop(handle) {
  const all = readAll();
  return all[handle] || null;
}

export function saveShop(handle, shop) {
  if (typeof window === "undefined") return;
  const all = readAll();
  const next = { ...shop, handle, updatedAt: new Date().toISOString() };
  all[handle] = next;
  writeAll(all);
  pushShop(handle, next);
  return next;
}

export function addSection(handle, section) {
  const shop = loadShop(handle);
  if (!shop) return null;
  const sections = Array.isArray(shop.sections) ? shop.sections.slice() : [];
  const id = section.id || `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  sections.push({ ...section, id });
  const next = { ...shop, sections };
  saveShop(handle, next);
  return next;
}

export function removeSection(handle, sectionId) {
  const shop = loadShop(handle);
  if (!shop || !Array.isArray(shop.sections)) return shop;
  const next = { ...shop, sections: shop.sections.filter((s) => s.id !== sectionId) };
  saveShop(handle, next);
  return next;
}

export function updateSection(handle, sectionId, patch) {
  const shop = loadShop(handle);
  if (!shop || !Array.isArray(shop.sections)) return shop;
  const sections = shop.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s));
  const next = { ...shop, sections };
  saveShop(handle, next);
  return next;
}

export function myHandle() {
  const all = readAll();
  const keys = Object.keys(all);
  return keys.length ? keys[0] : null;
}

// Called once at app boot alongside hydrateSession().
export async function hydrateShops() {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/shops", { method: "GET" });
    if (!res.ok) return;
    const { shops } = await res.json();
    const server = shops || {};
    const local = readAll();
    if (Object.keys(server).length > 0) {
      // Server is the durable source of truth on load; keep any local-only
      // shops that haven't been pushed yet.
      writeAll({ ...local, ...server });
      window.dispatchEvent(new Event("moonlight:hydrated"));
    } else if (Object.keys(local).length > 0) {
      for (const [h, s] of Object.entries(local)) pushShop(h, s);
    }
  } catch {}
}
