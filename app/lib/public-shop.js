import { cache } from "react";
import { getDb } from "./db";
import { normalizeHandle, publicShop } from "./shop-contract.mjs";

// React cache shares metadata/page reads within a request, never across visitors.
export const readPublicShop = cache((rawHandle) => {
  let handle;
  try { handle = normalizeHandle(rawHandle); } catch { return null; }
  try {
    const row = getDb().prepare("SELECT shop_json FROM shops WHERE handle = ?").get(handle);
    if (!row) return null;
    return publicShop(JSON.parse(row.shop_json), handle);
  } catch {
    // Do not expose legacy JSON, database errors or owner-only fields.
    throw new Error("Published shop unavailable");
  }
});

export function publicShopMetadata(shop, lang) {
  let origin = "https://luzdeluna.app";
  try {
    const configured = new URL(process.env.NEXT_PUBLIC_SITE_URL || origin);
    if (configured.protocol === "https:" && !configured.username && !configured.password &&
        configured.pathname === "/" && !configured.search && !configured.hash) origin = configured.origin;
  } catch {}
  const base = origin + "/shop/" + encodeURIComponent(shop.handle);
  const url = base + "?lang=" + lang;
  const title = (shop.offer.name || shop.ownerPublicName || "Luz de Luna").slice(0, 100) + " — Luz de Luna";
  const description = (shop.offer.description || shop.offer.tagline || (lang === "es" ? "Conoce este negocio local." : "Discover this local business.")).slice(0, 160);
  return {
    title, description,
    alternates: { canonical: url, languages: { en: base + "?lang=en", es: base + "?lang=es" } },
    openGraph: { title, description, url, siteName: "Luz de Luna", type: "website", locale: lang === "es" ? "es" : "en" },
  };
}
