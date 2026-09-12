import { withUser } from "../../lib/auth.mjs";
// Participant journey persistence. Optimistic revisions prevent stale clients
// from silently overwriting newer state; profile fields commit atomically.
import { NextResponse } from "next/server";
import { getDb } from "../../lib/db";
import { resolveParticipant, participantCacheScope } from "../../lib/participant";
import { MAX_STATE_BYTES, readState, saveState, validateStateWrite } from "../../lib/state-store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = { "Cache-Control": "no-store" };

async function handleGET() {
  const id = await resolveParticipant();
  return NextResponse.json({ ...readState(getDb(), id), cacheScope: participantCacheScope(id) }, { headers: responseHeaders });
}

async function handlePUT(req) {
  // Limit the full request, including chunked bodies, before parsing JSON.
  const reader = req.body?.getReader();
  if (!reader) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const chunks = [];
  let size = 0;
  const maxRequestBytes = MAX_STATE_BYTES + 4096;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxRequestBytes) {
        await reader.cancel();
        return NextResponse.json({ error: "state_too_large" }, { status: 413 });
      }
      chunks.push(Buffer.from(value));
    }
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  } finally {
    reader.releaseLock();
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const error = validateStateWrite(body);
  if (error) {
    return NextResponse.json({ error }, { status: error === "state_too_large" ? 413 : 400 });
  }

  const id = await resolveParticipant();
  if (body.cacheScope !== participantCacheScope(id)) {
    return NextResponse.json({ error: "cache_scope_mismatch" }, { status: 409, headers: responseHeaders });
  }
  const result = saveState(getDb(), id, body.state, body.baseRevision);
  if (result.conflict) {
    return NextResponse.json(
      { error: "revision_conflict", state: result.state, revision: result.revision },
      { status: 409, headers: responseHeaders }
    );
  }
  return NextResponse.json({ ok: true, revision: result.revision }, { headers: responseHeaders });
}

export const GET = withUser(handleGET);

export const PUT = withUser(handlePUT);
