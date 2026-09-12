import { normalizeShop, normalizeSection } from "./shop-contract.mjs";

export const BUILDER_BODY_LIMIT = 8 * 1024 * 1024;
export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 4000;
export const MAX_HISTORY_CHARS = 32000;
const invalid = () => { throw new Error("invalid_builder_request"); };
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
export function validateBuilderRequest(body) {
  if (!object(body) || Object.keys(body).some(key => !["shop", "messages", "lang"].includes(key))) invalid();
  if (!Array.isArray(body.messages) || body.messages.length > MAX_MESSAGES) invalid();
  if (body.lang !== undefined && !["en", "es"].includes(body.lang)) invalid();
  let total = 0;
  const messages = body.messages.map((message, index) => {
    if (!object(message) || Object.keys(message).some(key => !["role", "content"].includes(key)) ||
        !["user", "assistant"].includes(message.role) || (index === 0 && message.role !== "user") ||
        typeof message.content !== "string" || !message.content.trim() ||
        message.content.length > MAX_MESSAGE_CHARS) invalid();
    total += message.content.length;
    return { role: message.role, content: message.content };
  });
  if (total > MAX_HISTORY_CHARS) invalid();
  const shop = normalizeShop(body.shop);
  return { shop, messages, lang: body.lang ?? "en" };
}

export function validateBuilderResponse(value) {
  const bad = () => { throw new Error("invalid_builder_response"); };
  if (!object(value) || Object.keys(value).some(key => !["message", "proposedSection", "quickReplies", "notice"].includes(key))) bad();
  if (typeof value.message !== "string" || !value.message.trim() || value.message.length > 4000) bad();
  if (value.proposedSection !== null && !object(value.proposedSection)) bad();
  const proposedSection = value.proposedSection === null ? null : normalizeSection(value.proposedSection);
  if (value.quickReplies !== null && value.quickReplies !== undefined &&
      (!Array.isArray(value.quickReplies) || value.quickReplies.length > 6 ||
       value.quickReplies.some(reply => typeof reply !== "string" || !reply.trim() || reply.length > 200))) bad();
  if (value.notice !== undefined && value.notice !== null &&
      (typeof value.notice !== "string" || value.notice.length > 500)) bad();
  return {
    message: value.message,
    proposedSection,
    quickReplies: value.quickReplies ?? null,
    ...(value.notice !== undefined ? { notice: value.notice } : {}),
  };
}
