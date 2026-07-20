// A participant's own shop pages. GET returns all of hers (keyed by handle);
// PUT upserts one and records a timeline milestone the first time a handle is
// created. Public read-by-handle lives in ./[handle]/route.js so a shared shop
// link renders for anyone, not just its creator's browser.

import { NextResponse } from "next/server";
import { getDb } from "../../lib/db";
import { resolveParticipant } from "../../lib/participant";

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
  return NextResponse.json({ shops });
}

export async function PUT(req) {
  const id = await resolveParticipant();
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const handle = String(body?.handle || "").toLowerCase().trim();
  const shop = body?.shop;
  if (!handle || !shop) {
    return NextResponse.json({ error: "missing_handle_or_shop" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT participant_id FROM shops WHERE handle = ?").get(handle);
  if (existing && existing.participant_id !== id) {
    return NextResponse.json({ error: "handle_taken" }, { status: 409 });
  }
  const firstTime = !existing;

  db.prepare(
    `INSERT INTO shops (participant_id, handle, shop_json, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(handle)
     DO UPDATE SET shop_json = excluded.shop_json, updated_at = datetime('now')`
  ).run(id, handle, JSON.stringify(shop));

  if (firstTime) {
    db.prepare(
      "INSERT INTO timeline (participant_id, kind, summary, data_json) VALUES (?, 'shop_created', ?, ?)"
    ).run(id, "Shop page created: " + handle, JSON.stringify({ handle }));
  }
  return NextResponse.json({ ok: true });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
