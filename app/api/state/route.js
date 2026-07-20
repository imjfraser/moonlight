// Participant journey state: the structured business memory (intake, chosen
// idea, offer, price, brief, kit). One row per participant, keyed by the cookie
// identity. This is the durable replacement for the old sessionStorage blob.

import { NextResponse } from "next/server";
import { getDb } from "../../lib/db";
import { resolveParticipant } from "../../lib/participant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const id = await resolveParticipant();
  const db = getDb();
  const row = db
    .prepare("SELECT state_json FROM participant_state WHERE participant_id = ?")
    .get(id);
  return NextResponse.json({ state: row ? safeParse(row.state_json) : null });
}

export async function PUT(req) {
  const id = await resolveParticipant();
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const state = body?.state ?? {};
  const db = getDb();
  db.prepare(
    `INSERT INTO participant_state (participant_id, state_json, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(participant_id)
     DO UPDATE SET state_json = excluded.state_json, updated_at = datetime('now')`
  ).run(id, JSON.stringify(state));

  // Keep the participant's display fields in step with her intake.
  const intake = state?.intake || {};
  db.prepare("UPDATE participants SET display_name = ?, public_name = ? WHERE id = ?").run(
    intake.name || null,
    intake.publicName || null,
    id
  );
  return NextResponse.json({ ok: true });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
