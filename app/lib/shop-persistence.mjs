// Ownership, shop persistence, and first-publication milestone are one write unit.
export function saveShop(db, participantId, handle, shop) {
  return db.transaction(() => {
    const existing = db.prepare("SELECT participant_id FROM shops WHERE handle = ?").get(handle);
    if (existing && existing.participant_id !== participantId) return { error: "handle_taken" };
    if (existing) {
      db.prepare("UPDATE shops SET shop_json = ?, updated_at = datetime('now') WHERE handle = ? AND participant_id = ?")
        .run(JSON.stringify(shop), handle, participantId);
    } else {
      db.prepare("INSERT INTO shops (participant_id, handle, shop_json, updated_at) VALUES (?, ?, ?, datetime('now'))")
        .run(participantId, handle, JSON.stringify(shop));
      db.prepare("INSERT INTO timeline (participant_id, kind, summary, data_json) VALUES (?, 'shop_created', ?, ?)")
        .run(participantId, "Shop page created: " + handle, JSON.stringify({ handle }));
    }
    return { ok: true };
  }).immediate();
}
