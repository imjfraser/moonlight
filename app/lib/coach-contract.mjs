// Shared transport contract; no storage/browser dependencies. Full conversation
// storage is unchanged: only the outbound model window is bounded.
export const COACH_BODY_LIMIT = 1024 * 1024;
export const MAX_COACH_MESSAGES = 40;
export const MAX_COACH_MESSAGE_CHARS = 4000;
export const MAX_COACH_HISTORY_CHARS = 64000;
export const COACH_STATES = ["greeting", "skill_exploration", "first_customer_id", "offer_proposal", "action_drafted", "marketing_plan", "done"];
const RESPONSE_KEYS = ["message", "state", "quickReplies", "proposedOffer", "draftedMessage", "marketingPlan", "shopHandle", "skillGapAdvice", "notice"];
const ARTIFACT_KEYS = ["state", "quickReplies", "proposedOffer", "draftedMessage", "marketingPlan", "shopHandle", "skillGapAdvice", "notice"];
const invalid = () => { throw new Error("invalid_coach_contract"); };
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
function text(value, max, nonempty = false) {
  if (typeof value !== "string" || value.length > max || (nonempty && !value.trim())) invalid();
  return value;
}
function keys(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) invalid();
}
function stringList(value, maxItems, maxLength) {
  if (!Array.isArray(value) || value.length > maxItems) invalid();
  return value.map(item => text(item, maxLength, true));
}
export function normalizeCoachOffer(value) {
  const lengths = { name: 300, tagline: 500, description: 4000, priceLocal: 200, deliveryWindow: 300, firstCustomer: 1000, scalingPath: 4000 };
  keys(value, [...Object.keys(lengths), "priceUSD"]);
  const out = {};
  for (const [key, max] of Object.entries(lengths)) out[key] = text(value[key], max);
  if (typeof value.priceUSD !== "number" || !Number.isFinite(value.priceUSD) || value.priceUSD < 0 || value.priceUSD > 1e9) invalid();
  out.priceUSD = value.priceUSD;
  return out;
}
export function normalizeCoachPlan(value) {
  const lengths = { primaryChannel: 300, secondaryChannel: 300, daily: 4000, weekly: 4000, examplePostHook: 4000, thirtyDayGoal: 1000 };
  keys(value, [...Object.keys(lengths), "aiToolsToUse"]);
  const out = {};
  for (const [key, max] of Object.entries(lengths)) out[key] = text(value[key], max);
  out.aiToolsToUse = stringList(value.aiToolsToUse, 10, 200);
  return out;
}
export function normalizeCoachArtifact(key, value) {
  if (value === null || value === undefined) return null;
  if (key === "state") {
    if (!COACH_STATES.includes(value)) invalid();
    return value;
  }
  if (key === "proposedOffer") return normalizeCoachOffer(value);
  if (key === "marketingPlan") return normalizeCoachPlan(value);
  if (key === "quickReplies") return stringList(value, 4, 200);
  if (key === "shopHandle") {
    text(value, 80, true);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) invalid();
    return value;
  }
  return text(value, key === "notice" ? 500 : 4000);
}
export function validateCoachResponse(value) {
  keys(value, RESPONSE_KEYS);
  const out = { message: text(value.message, MAX_COACH_MESSAGE_CHARS, true), state: normalizeCoachArtifact("state", value.state) };
  if (!out.state) invalid();
  for (const key of ARTIFACT_KEYS.filter(key => key !== "state")) out[key] = normalizeCoachArtifact(key, value[key]);
  return out;
}
function normalizeIntake(value) {
  if (!object(value)) invalid();
  // Keep existing collection fields; tolerate additional stored fields without
  // treating them as instructions or adding them to the provider context.
  const lengths = { name: 500, publicName: 500, skills: 8000, askedFor: 8000, offerType: 200, hoursPerWeek: 200, safetyNotes: 8000 };
  const out = {};
  for (const [key, max] of Object.entries(lengths)) if (value[key] !== undefined) out[key] = text(value[key], max);
  if (value.showRealName !== undefined) {
    if (typeof value.showRealName !== "boolean") invalid();
    out.showRealName = value.showRealName;
  }
  if (value.channels !== undefined) out.channels = stringList(value.channels, 30, 100);
  return out;
}
function normalizeHistoryMessage(value) {
  keys(value, ["role", "content", ...ARTIFACT_KEYS]);
  if (!["user", "assistant"].includes(value.role)) invalid();
  const out = { role: value.role, content: text(value.content, MAX_COACH_MESSAGE_CHARS, true) };
  for (const key of ARTIFACT_KEYS) {
    if (value[key] !== undefined) {
      if (value.role !== "assistant") invalid();
      out[key] = normalizeCoachArtifact(key, value[key]);
    }
  }
  return out;
}
export function validateCoachRequest(value) {
  keys(value, ["intake", "messages", "lang", "cacheScope"]);
  if (typeof value.cacheScope !== "string" || !/^[a-f0-9]{64}$/.test(value.cacheScope)) invalid();
  if (value.lang !== undefined && !["en", "es"].includes(value.lang)) invalid();
  if (!Array.isArray(value.messages) || value.messages.length > MAX_COACH_MESSAGES) invalid();
  const messages = value.messages.map(normalizeHistoryMessage);
  if (messages.reduce((sum, message) => sum + JSON.stringify(message).length, 0) > MAX_COACH_HISTORY_CHARS) invalid();
  return { intake: normalizeIntake(value.intake), messages, lang: value.lang ?? "en", cacheScope: value.cacheScope };
}
export function boundedCoachHistory(history) {
  const out = [];
  let chars = 0;
  for (const original of history.slice(-MAX_COACH_MESSAGES).reverse()) {
    const message = { role: original.role, content: original.content.slice(0, MAX_COACH_MESSAGE_CHARS) };
    if (original.role === "assistant") {
      for (const key of ARTIFACT_KEYS) if (original[key] !== undefined) message[key] = original[key];
    }
    const length = JSON.stringify(message).length;
    if (chars + length > MAX_COACH_HISTORY_CHARS) break;
    chars += length;
    out.unshift(message);
  }
  return out;
}
