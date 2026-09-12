import Anthropic from "@anthropic-ai/sdk";
import { BUILDER_SYSTEM_PROMPT } from "../../lib/builder-prompt";
import { BUILDER_BODY_LIMIT, validateBuilderRequest, validateBuilderResponse } from "../../lib/builder-contract.mjs";
import { readRequestJson } from "../../lib/request-json.mjs";
import { checkBuilderLimit } from "../../lib/rate-limit.mjs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
export const runtime = "nodejs";

function failure(error, status, headers = {}) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(req) {
  const limit = checkBuilderLimit(req.headers.get("cookie") || "");
  if (!limit.allowed) return failure("rate_limited", 429, { "Retry-After": String(limit.retryAfter) });
  let body;
  try {
    body = await readRequestJson(req, BUILDER_BODY_LIMIT);
  } catch (error) {
    return failure(error.status === 413 ? "payload_too_large" : "invalid_json", error.status === 413 ? 413 : 400);
  }
  let input;
  try { input = validateBuilderRequest(body); }
  catch { return failure("invalid_builder_request", 400); }
  const { shop, messages, lang } = input;
  if (!process.env.ANTHROPIC_API_KEY) {
    try {
      return Response.json(validateBuilderResponse(offlineBuilder(shop, messages)), { headers: { "Cache-Control": "no-store" } });
    } catch { return failure("invalid_builder_response", 502); }
  }
  const context = formatShop(shop);
  const langName = lang === "es" ? "Spanish (LATAM, use tú not usted)" : "English";
  const langDirective = `LANGUAGE — IMPORTANT: Respond in ${langName} unless she clearly switches mid-conversation. Only the prose values in your JSON should be in her language; keys, type names, and tool names stay as-is.`;
  let response;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60000, maxRetries: 0 });
    const kickoffEs = "Por favor salúdame y sugiere una cosa concreta que pueda agregar a mi página primero.";
    const kickoffEn = "Please greet me and suggest one specific thing I could add to my page first.";
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `${BUILDER_SYSTEM_PROMPT}\n\n${langDirective}\n\nHER PAGE RIGHT NOW:\n${context}`,
      messages: messages.length ? messages : [{ role: "user", content: lang === "es" ? kickoffEs : kickoffEn }],
    });
  } catch (error) {
    const timeout = error?.name === "APIConnectionTimeoutError" || error?.name === "AbortError";
    return failure(timeout ? "upstream_timeout" : "upstream_error", timeout ? 504 : 502);
  }
  try {
    const text = response.content.filter(block => block.type === "text").map(block => block.text).join("").trim();
    return Response.json(validateBuilderResponse(safeParseJson(text)), { headers: { "Cache-Control": "no-store" } });
  } catch { return failure("invalid_builder_response", 502); }
}

function formatShop(shop) {
  const lines = [];
  lines.push(`Handle: ${shop.handle}`);
  lines.push(`Owner public name: ${shop.ownerPublicName}`);
  lines.push(`Real name shown publicly: ${shop.showRealName ? "yes" : "no"}`);
  if (shop.offer) {
    lines.push("");
    lines.push("MAIN OFFER:");
    lines.push(`  Name: ${shop.offer.name}`);
    lines.push(`  Tagline: ${shop.offer.tagline}`);
    lines.push(`  Description: ${shop.offer.description}`);
    if (shop.offer.priceUSD) lines.push(`  Price: USD ${shop.offer.priceUSD} (${shop.offer.priceLocal || ""})`);
    if (shop.offer.firstCustomer) lines.push(`  First customer: ${shop.offer.firstCustomer}`);
  }
  if (Array.isArray(shop.sections) && shop.sections.length) {
    lines.push("");
    lines.push("EXISTING ADDITIONAL SECTIONS:");
    for (const s of shop.sections) {
      lines.push(`  - ${s.type}: ${s.title}`);
    }
  } else {
    lines.push("");
    lines.push("EXISTING ADDITIONAL SECTIONS: (none yet — this is her chance to add the first)");
  }
  return lines.join("\n");
}

function safeParseJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function offlineBuilder(shop, messages) {
  const turn = messages.filter((m) => m.role === "user").length;
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content?.toLowerCase() || "";
  const owner = shop.ownerPublicName || "you";
  const offerName = shop.offer?.name || "your offer";
  const existing = (shop.sections || []).map((s) => s.type);

  const intent = detectIntent(lastUser);
  if (intent) return responseFor(intent, { owner, offerName, shop });

  const candidates = [
    { type: "testimonial", title: "What people say", data: { quote: `${owner} did a great job — clear, on time, and easy to work with.`, author: shop.offer?.firstCustomer?.split(/[—,.]/)[0]?.trim() || "Your first customer" }, message: `Let's add a short testimonial.`, quickReplies: ["Add it", "Different wording", "Not yet"] },
    { type: "faq", title: "Common questions", data: { items: [{ q: "How fast do you reply?", a: "Usually within two hours during the day." }, { q: "How do I pay?", a: "Whatever works for you — bank transfer, mobile money, or in person." }, { q: "What if I'm not happy?", a: "Tell me first and I'll make it right." }] }, message: `Three short FAQs.`, quickReplies: ["Add it", "Different questions", "Not yet"] },
    { type: "promo", title: "This week only", data: { headline: "First 3 customers — small bonus", detail: "Order this week and I'll throw in something extra.", until: "this Sunday" }, message: `Add a promo banner.`, quickReplies: ["Add it", "Stronger", "Not yet"] },
    { type: "about-extra", title: "Why I started this", data: { heading: "A bit more about me", body: `I started ${offerName} because I noticed people kept asking me for the same kind of help.` }, message: `Two sentences about why you started.`, quickReplies: ["Add it", "Different angle", "Not yet"] },
    { type: "service", title: "Another option", data: { name: `${offerName} — bigger package`, description: "A larger version for customers who want more.", priceUSD: (shop.offer?.priceUSD || 25) * 4, priceLocal: `USD ${(shop.offer?.priceUSD || 25) * 4}`, deliveryWindow: "Within 2 weeks" }, message: `Add a second package.`, quickReplies: ["Add it", "Different price", "Not yet"] },
    { type: "social", title: "Find me here too", data: { links: [{ platform: "Instagram", url: "" }, { platform: "TikTok", url: "" }] }, message: `Link your other accounts.`, quickReplies: ["Add it", "Just one for now", "Not yet"] },
    { type: "gallery", title: "My work", data: { title: "My work", photos: [{ url: "", caption: "A photo of your finished work" }, { url: "", caption: "You at work" }, { url: "", caption: "A happy customer" }] }, message: `Add a photo gallery.`, quickReplies: ["Add it", "Just one photo", "Not yet"] },
  ];

  const next = candidates.find((c) => !existing.includes(c.type)) || candidates[turn % candidates.length];

  return {
    message: next.message,
    proposedSection: { type: next.type, title: next.title, data: next.data },
    quickReplies: next.quickReplies,
    notice: turn === 0 ? "Running in offline mode — set ANTHROPIC_API_KEY for real adaptive suggestions." : null,
  };
}

function detectIntent(text) {
  if (!text) return null;
  if (/\b(picture|photo|image|gallery|imagen|foto|fotos)\b/i.test(text)) return "gallery";
  if (/\b(testimonial|review|quote|customer says|testimonio|rese[ñn]a)\b/i.test(text)) return "testimonial";
  if (/\b(faq|question|preguntas frecuentes|q&a)\b/i.test(text)) return "faq";
  if (/\b(promo|discount|deal|special|descuento|oferta)\b/i.test(text)) return "promo";
  if (/\b(about|story|me|sobre m[íi])\b/i.test(text) && /\b(add|more|extra)\b/i.test(text)) return "about-extra";
  if (/\b(another service|new offer|second offer|otra opci[óo]n|paquete)\b/i.test(text)) return "service";
  if (/\b(booking|calendar|book a time|calendly|cita|agendar)\b/i.test(text)) return "booking";
  if (/\b(newsletter|email list|subscribe|correo)\b/i.test(text)) return "newsletter";
  if (/\b(instagram|tiktok|linkedin|youtube|facebook|social)\b/i.test(text)) return "social";
  return null;
}

function responseFor(intent, ctx) {
  const { owner, offerName, shop } = ctx;
  if (intent === "gallery") return { message: `Photos make a huge difference. After you click "Add it", you can drop in actual photos from your phone or paste a URL.`, proposedSection: { type: "gallery", title: "My work", data: { title: "My work", photos: [{ url: "", caption: "A photo of your finished work" }, { url: "", caption: "You at work" }, { url: "", caption: "A happy customer" }] } }, quickReplies: ["Add it", "Just one photo", "Not yet"] };
  if (intent === "testimonial") return { message: `Add a short testimonial — placeholder until you have a real quote.`, proposedSection: { type: "testimonial", title: "What people say", data: { quote: `${owner} did a great job.`, author: shop.offer?.firstCustomer?.split(/[—,.]/)[0]?.trim() || "Your first customer" } }, quickReplies: ["Add it", "Different wording", "Not yet"] };
  if (intent === "faq") return { message: `Three quick FAQs.`, proposedSection: { type: "faq", title: "Common questions", data: { items: [{ q: "How fast do you reply?", a: "Within two hours during the day." }, { q: "How do I pay?", a: "Whatever works for you." }, { q: "What if I'm not happy?", a: "Tell me first and I'll make it right." }] } }, quickReplies: ["Add it", "Different questions", "Not yet"] };
  if (intent === "promo") return { message: `Add a promo banner.`, proposedSection: { type: "promo", title: "This week only", data: { headline: "First 3 customers — small bonus", detail: "Order this week and I'll throw in something extra.", until: "this Sunday" } }, quickReplies: ["Add it", "Stronger", "Not yet"] };
  if (intent === "about-extra") return { message: `Two sentences about why you started this.`, proposedSection: { type: "about-extra", title: "Why I started this", data: { heading: "A bit more about me", body: `I started ${offerName} because people kept asking me for help.` } }, quickReplies: ["Add it", "Different angle", "Not yet"] };
  if (intent === "service") return { message: `A second package — different size, different price.`, proposedSection: { type: "service", title: "Another option", data: { name: `${offerName} — bigger package`, description: "A larger version.", priceUSD: (shop.offer?.priceUSD || 25) * 4, priceLocal: `USD ${(shop.offer?.priceUSD || 25) * 4}`, deliveryWindow: "Within 2 weeks" } }, quickReplies: ["Add it", "Different price", "Not yet"] };
  if (intent === "booking") return { message: `Paste your Calendly URL after you add it.`, proposedSection: { type: "booking", title: "Book a time", data: { label: "Pick a time", url: "" } }, quickReplies: ["Add it", "Not yet"] };
  if (intent === "newsletter") return { message: `For people who aren't ready to buy today.`, proposedSection: { type: "newsletter", title: "Stay in touch", data: { label: "Drop your email", prompt: "I'll write you when there's something new." } }, quickReplies: ["Add it", "Not yet"] };
  if (intent === "social") return { message: `Link your other accounts.`, proposedSection: { type: "social", title: "Find me here too", data: { links: [{ platform: "Instagram", url: "" }, { platform: "TikTok", url: "" }] } }, quickReplies: ["Add it", "Just one for now", "Not yet"] };
  return null;
}
