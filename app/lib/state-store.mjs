import { recordJourney } from "./admin-metrics.mjs";
import { markVaultDirty } from "./vault-sync.mjs";
import { createHash } from "node:crypto";

export const MAX_STATE_BYTES = 1024 * 1024;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateStateWrite(body) {
  if (!isObject(body) || !isObject(body.state)) return "invalid_state";
  if (typeof body.baseRevision !== "string" || !/^[a-f0-9]{64}$/.test(body.baseRevision)) {
    return "invalid_base_revision";
  }
  const intake = body.state.intake;
  if (intake !== undefined) {
    if (!isObject(intake)) return "invalid_intake";
    for (const key of ["name", "publicName"]) {
      if (intake[key] !== undefined && intake[key] !== null &&
          (typeof intake[key] !== "string" || intake[key].length > 500)) {
        return "invalid_profile_name";
      }
    }
  }
  if (Buffer.byteLength(JSON.stringify(body.state), "utf8") > MAX_STATE_BYTES) {
    return "state_too_large";
  }
  return null;
}

export function readState(db, participantId) {
  const row = db.prepare(
    "SELECT state_json FROM participant_state WHERE participant_id = ?"
  ).get(participantId);
  const serialized = row ? row.state_json : "null";
  // Hash the stored bytes, not a reserialized object, to recognize legacy rows.
  const revision = createHash("sha256").update(serialized).digest("hex");
  let state = null;
  if (row) {
    try { state = JSON.parse(serialized); } catch {
      // Never silently replace an unreadable persisted state.
      throw new Error("stored_state_invalid_json");
    }
  }
  return { state, revision };
}

export function saveState(db, participantId, state, baseRevision) {
  // IMMEDIATE reserves the writer before the comparison across processes.
  return db.transaction(() => {
    const current = readState(db, participantId);
    if (current.revision !== baseRevision) {
      return { conflict: true, ...current };
    }
    const serialized = JSON.stringify(state);
    db.prepare(
      `INSERT INTO participant_state (participant_id, state_json, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(participant_id)
       DO UPDATE SET state_json = excluded.state_json, updated_at = datetime('now')`
    ).run(participantId, serialized);
    const intake = state.intake || {};
    db.prepare("UPDATE participants SET display_name = ?, public_name = ? WHERE id = ?")
      .run(intake.name || null, intake.publicName || null, participantId);
    if (createHash("sha256").update(serialized).digest("hex") !== current.revision) {
      markVaultDirty(db,participantId);
      recordJourney(db,participantId,current.state || {},state);
    }
    return {
      conflict: false,
      revision: createHash("sha256").update(serialized).digest("hex"),
    };
  }).immediate();
}
