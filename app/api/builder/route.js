import Anthropic from "@anthropic-ai/sdk";
import { BUILDER_SYSTEM_PROMPT } from "../../lib/builder-prompt";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export const runtime = "nodejs";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const { shop, messages, lang } = body || {};
  if (!shop || !Array.isArray(messages)) {
    return Response.json({ error: "missing_shop_or_messages" }, { status: 400 });
  }

  const context = formatShop(shop);
  const langName = lang === "es" ? "Spanish (LATAM, use tú not usted)" : "English";
  const langDirective = `LANGUAGE — IMPORTANT: Respond in ${langName} unless she clearly switches mid-conversation. Only the prose values in your JSON should be in her language; keys, type names, and tool names stay as-is.`;

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(offlineBuilder(shop, messages));
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const kickoffEs = "Por favor salúdame y sugiere una cosa concreta que pueda agregar a mi página primero.";
    const kickoffEn = "Please greet me and suggest one specific thing I could add to my page first.";
    const messagesForClaude = messages.length > 0
      ? messages.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: lang === "es" ? kickoffEs : kickoffEn }];

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `${BUILDER_SYSTEM_PROMPT}\n\n${langDirective}\n\nHER PAGE RIGHT NOW:\n${context}`,
      messages: messagesForClaude,
    });
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const parsed = safeParseJson(text);
    if (!parsed) {
      return Response.json({
        message: "Let me try that again — could you tell me what you'd like to add?",
        proposedSection: null,
        quickReplies: ["Add a testimonial", "Add another service", "Add an FAQ"],
        raw: text,
        error: "model_returned_non_json",
      });
    }
    return Response.json(parsed);
  } catch (err) {
    console.error("builder api error", err);
    return Response.json({
      message: "I lost the connection for a second. Try once more.",
      proposedSection: null,
      quickReplies: null,
      error: "upstream_error",
    });
  }
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
