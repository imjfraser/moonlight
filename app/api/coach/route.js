import { withUser } from "../../lib/auth.mjs";
// Web adapter around a transport-independent coach contract and context builder.
import Anthropic from "@anthropic-ai/sdk";
import { COACH_SYSTEM_PROMPT } from "../../lib/coach-prompt";
import { COACH_BODY_LIMIT, validateCoachRequest, validateCoachResponse } from "../../lib/coach-contract.mjs";
import { buildCoachMessages } from "../../lib/coach-context.mjs";
import { checkCoachLimit } from "../../lib/coach-rate-limit.mjs";
import { readRequestJson } from "../../lib/request-json.mjs";
import { getDb } from "../../lib/db";
import { resolveParticipant, participantCacheScope } from "../../lib/participant";
import { readState } from "../../lib/state-store.mjs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
export const runtime = "nodejs";
function failure(error, status, headers = {}) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
async function handlePOST(req) {
  const quota = checkCoachLimit(req.headers.get("cookie") || "");
  if (!quota.allowed) return failure("rate_limited", 429, { "Retry-After": String(quota.retryAfter) });
  let body;
  try { body = await readRequestJson(req, COACH_BODY_LIMIT); }
  catch (error) { return failure(error.status === 413 ? "payload_too_large" : "invalid_json", error.status === 413 ? 413 : 400); }
  let input;
  try { input = validateCoachRequest(body); }
  catch { return failure("invalid_coach_request", 400); }

  let memory;
  try {
    const participantId = await resolveParticipant();
    if (participantCacheScope(participantId) !== input.cacheScope) {
      return failure("cache_scope_mismatch", 409);
    }
    memory = readState(getDb(), participantId).state;
  } catch { return failure("memory_unavailable", 503); }

  if (!process.env.ANTHROPIC_API_KEY) {
    try {
      return Response.json(validateCoachResponse(offlineFallback(input.intake, input.messages)), { headers: { "Cache-Control": "no-store" } });
    } catch { return failure("invalid_coach_response", 502); }
  }
  const langName = input.lang === "es" ? "Spanish (LATAM, use tú not usted)" : "English";
  const langDirective = `LANGUAGE — IMPORTANT: She has chosen ${langName}. Respond in ${langName} unless she clearly switches mid-conversation, in which case follow her lead. Keep the JSON output schema unchanged — only the prose values (message, quickReplies, proposedOffer.*, draftedMessage, marketingPlan.*, skillGapAdvice) should be in her language.`;
  let response;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60000, maxRetries: 0 });
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: `${COACH_SYSTEM_PROMPT}\n\n${langDirective}`,
      messages: buildCoachMessages(input, memory),
    });
  } catch (error) {
    const timeout = error?.name === "APIConnectionTimeoutError" || error?.name === "AbortError";
    return failure(timeout ? "upstream_timeout" : "upstream_error", timeout ? 504 : 502);
  }
  try {
    const text = response.content.filter(block => block.type === "text").map(block => block.text).join("").trim();
    return Response.json(validateCoachResponse(safeParseJson(text)), { headers: { "Cache-Control": "no-store" } });
  } catch { return failure("invalid_coach_response", 502); }
}

function safeParseJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

function offlineFallback(intake, messages) {
  const turn = messages.filter((m) => m.role === "user").length;
  const name = (intake.name || "friend").split(" ")[0].slice(0, 80);
  const skill = (intake.skills || intake.askedFor || "what you're already good at").split(/[,.]/)[0].slice(0, 120);
  const publicName = (intake.publicName || name).slice(0, 120);

  if (turn === 0) {
    return {
      message: `Hi ${name}. I'm Sol — your coach. I heard you're good at ${skill}. Let me ask you one thing first: what's the thing people already pay you for, or would pay you for tomorrow if you asked them today?`,
      state: "greeting",
      quickReplies: null,
      notice: "Running in offline mode — set ANTHROPIC_API_KEY for the real coach.",
    };
  }
  if (turn === 1) {
    return {
      message: `Good. So your ${skill} is the thing. Now — could you imagine doing this for someone outside your neighbourhood?`,
      state: "skill_exploration",
      quickReplies: ["Yes, I could", "I'm not sure", "Tell me more"],
    };
  }
  if (turn === 2) {
    return {
      message: `Think of one person you already know who would say yes if you offered them this today. Who is it?`,
      state: "first_customer_id",
      quickReplies: null,
    };
  }
  if (turn === 3) {
    return {
      message: `Here's your first offer. Small enough to say yes to, big enough to matter.`,
      state: "offer_proposal",
      proposedOffer: {
        name: `${publicName}'s ${skill}`,
        tagline: `${skill}, done with care, delivered this week`,
        description: `One starter version of your ${skill}, delivered or available within 7 days.`,
        priceUSD: 25,
        priceLocal: "USD 25",
        deliveryWindow: "This week",
        firstCustomer: "Your first contact (the person you named).",
        scalingPath: `Start with this one customer at USD 25. Once you've delivered to 3 customers, raise to USD 40. To reach USD 2,500/month, package it for online clients.`,
      },
      quickReplies: ["I like this", "Make it simpler", "Different price"],
    };
  }
  if (turn === 4) {
    return {
      message: `Here's the message you can send right now. Copy it, send it on WhatsApp, see what they say.`,
      state: "action_drafted",
      draftedMessage: `Hi! It's ${publicName}. I'm starting something small — ${skill}, for USD 25 this week. Would you like to be one of my first customers? Reply here if yes and I'll send the details. Thank you 🌻`,
      quickReplies: ["I'll send it", "Edit the message"],
    };
  }
  return {
    message: `Your page draft is prepared for /shop/${slugify(publicName)}. Check the publication status below before sharing it.`,
    state: "done",
    shopHandle: slugify(publicName),
    quickReplies: null,
  };
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40).replace(/-+$/g, "") || "shop";
}

export const POST = withUser(handlePOST);
