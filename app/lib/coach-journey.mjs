export const ARTIFACTS = ["proposedOffer", "draftedMessage", "shopHandle", "skillGapAdvice", "marketingPlan"];
export function journeyView(session) {
  const history = Array.isArray(session.coachConversation) ? session.coachConversation : [];
  const assistant = history.filter(m => m.role === "assistant");
  const last = assistant.at(-1);
  const view = { messages: history, state: session.coachState || last?.state || "greeting",
    quickReplies: history.at(-1)?.role === "assistant" ? last?.quickReplies || null : null };
  for (const key of ARTIFACTS) view[key] = session[key] ?? [...assistant].reverse().find(m => m[key] != null)?.[key] ?? null;
  return view;
}
export function hasIntake(session) {
  return ["name", "skills", "askedFor"].some(key => typeof session.intake?.[key] === "string" && session.intake[key].trim());
}
export function appendCoachReply(latest, history, reply) {
  const previous = journeyView(latest);
  const next = { ...latest, coachConversation: [...history, reply], coachState: reply.state || previous.state };
  for (const key of ARTIFACTS) next[key] = reply[key] ?? previous[key];
  return next;
}
export function resetCoachJourney(latest) {
  const next = { ...latest, coachConversation: [], coachState: null };
  for (const key of ARTIFACTS) next[key] = null;
  return next;
}
export function missingShopDraft(session, existing, now = new Date().toISOString()) {
  if (existing) return null; // Never replace an owner's offer, sections, contact or preferences.
  const view = journeyView(session);
  if (!view.shopHandle || !view.proposedOffer) return null;
  const intake = session.intake || {};
  return { handle: view.shopHandle,
    ownerPublicName: (intake.publicName || (intake.showRealName === true ? intake.name : "") || "").trim() || "Owner",
    showRealName: intake.showRealName === true, ownerRealName: intake.name || "",
    offer: view.proposedOffer, contact: { channels: intake.channels || ["WhatsApp"] },
    sections: [], savedAt: now };
}

// Do not let provider context race an unsaved reset or user turn.
export function waitForJourneySave(subscribe, getStatus, signal, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    let settled = false;
    let timer;
    function finish(error) {
      if (settled) return;
      settled = true;
      unsubscribe();
      clearTimeout(timer);
      signal?.removeEventListener("abort", aborted);
      error ? reject(error) : resolve();
    }
    function aborted() { finish(Object.assign(new Error("aborted"), { name: "AbortError" })); }
    function check() {
      const status = getStatus().status;
      if (status === "saved" || status === "ready") {
        // Hydration may emit ready then saving in the same turn while replaying a journal.
        queueMicrotask(() => {
          if (signal?.aborted) return aborted();
          const latest = getStatus().status;
          if (latest === "saved" || latest === "ready") finish();
        });
      }
      else if (status === "failed") finish(new Error("journey_not_saved"));
    }
    if (signal?.aborted) { aborted(); return; }
    signal?.addEventListener("abort", aborted, { once: true });
    timer = setTimeout(() => finish(new Error("journey_save_timeout")), timeoutMs);
    unsubscribe = subscribe(check);
    check();
  });
}
