// Tiny localStorage-backed store for shop records.
// Used by /architect (to write the first shop), /me (to read & extend),
// and /shop/[handle] (to render).
//
// When we add a real DB, only these three functions need to change.

const KEY = "moonlight.shops";

export function loadShops() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function loadShop(handle) {
  const all = loadShops();
  return all[handle] || null;
}

export function saveShop(handle, shop) {
  if (typeof window === "undefined") return;
  const all = loadShops();
  all[handle] = { ...shop, handle, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(all));
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
  const all = loadShops();
  const keys = Object.keys(all);
  return keys.length ? keys[0] : null;
}
