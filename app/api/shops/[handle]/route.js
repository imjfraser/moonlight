// Public shops are projected explicitly; owner-only business context never leaves here.
import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { normalizeHandle, publicShop } from "../../../lib/shop-contract.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(_req, { params }) {
  const p = await params;
  let handle;
  try { handle = normalizeHandle(p?.handle); }
  catch { return NextResponse.json({ shop: null }, { status: 404, headers }); }
  const row = getDb().prepare("SELECT shop_json FROM shops WHERE handle = ?").get(handle);
  if (!row) return NextResponse.json({ shop: null }, { status: 404, headers });
  try {
    const shop = publicShop(JSON.parse(row.shop_json), handle);
    return NextResponse.json({ shop }, { headers });
  } catch {
    return NextResponse.json({ shop: null, error: "shop_unavailable" }, { status: 503, headers });
  }
}
