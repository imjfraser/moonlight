// Public read of a single shop by handle. No cookie / participant required:
// this is what makes a shared shop link render on anyone's device.

import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const p = await params;
  const handle = String(p?.handle || "").toLowerCase();
  const db = getDb();
  const row = db.prepare("SELECT shop_json FROM shops WHERE handle = ?").get(handle);
  if (!row) return NextResponse.json({ shop: null }, { status: 404 });
  let shop;
  try {
    shop = JSON.parse(row.shop_json);
  } catch {
    shop = null;
  }
  return NextResponse.json({ shop });
}
