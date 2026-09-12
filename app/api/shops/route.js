// A participant's own shop pages. GET returns all of hers (keyed by handle);
// PUT upserts one and records a timeline milestone the first time a handle is
// created. Public read-by-handle lives in ./[handle]/route.js so a shared shop
// link renders for anyone, not just its creator's browser.

import { NextResponse } from "next/server";
import { getDb } from "../../lib/db";
import { saveShop } from "../../lib/shop-persistence.mjs";
import { resolveParticipant } from "../../lib/participant";
import { normalizeShop, normalizeHandle, SHOP_BODY_LIMIT } from "../../lib/shop-contract.mjs";
import { readRequestJson } from "../../lib/request-json.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const id = await resolveParticipant();
  const db = getDb();
  const rows = db
    .prepare("SELECT handle, shop_json FROM shops WHERE participant_id = ? ORDER BY updated_at DESC")
    .all(id);
  const shops = {};
  for (const r of rows) {
    const s = safeParse(r.shop_json);
    if (s) shops[r.handle] = s;
  }
  return NextResponse.json({ shops }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req) {
  let handle, shop;
  try {
    const body = await readRequestJson(req, SHOP_BODY_LIMIT + 4096);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).some(key => !["handle", "shop"].includes(key))) {
      throw new Error("invalid_shop");
    }
    handle = normalizeHandle(body.handle);
    shop = normalizeShop(body.shop, handle);
  } catch (error) {
    const tooLarge = error.status === 413;
    return NextResponse.json({ error: tooLarge ? "payload_too_large" : "invalid_shop" }, { status: tooLarge ? 413 : 400 });
  }
  const id = await resolveParticipant();

  const db = getDb();
  const result = saveShop(db, id, handle, shop);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
