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

  const { shop, messages } = body || {};
  if (!shop || !Array.isArray(messages)) {
    return Response.json({ error: "missing_shop_or_messages" }, { status: 400 });
  }

  const context = formatShop(shop);

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(offlineBuilder(shop, messages));
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `${BUILDER_SYSTEM_PROMPT}\n\nHER PAGE RIGHT NOW:\n${context}`,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
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
  const owner = shop.ownerPublicName || "you";
  const offerName = shop.offer?.name || "your offer";
  const existing = (shop.sections || []).map((s) => s.type);

  const candidates = [
    {
      type: "testimonial",
      title: "What people say",
      data: {
        quote: `${owner} did a great job — clear, on time, and easy to work with.`,
        author: shop.offer?.firstCustomer?.split(/[—,.]/)[0]?.trim() || "Your first customer",
      },
      message: `Let's add a short testimonial — even a placeholder one until you have a real quote. People trust a page much more when there's a name and a sentence next to your offer.`,
      quickReplies: ["Add it", "Different wording", "Not yet"],
    },
    {
      type: "faq",
      title: "Common questions",
      data: {
        items: [
          { q: "How fast do you reply?", a: "Usually within two hours during the day." },
          { q: "How do I pay?", a: "Whatever works for you — bank transfer, mobile money, or in person." },
          { q: "What if I'm not happy?", a: "Tell me first and I'll make it right." },
        ],
      },
      message: `Let's add three short FAQs — the ones customers always ask. It saves you typing the same answer ten times.`,
      quickReplies: ["Add it", "Different questions", "Not yet"],
    },
    {
      type: "promo",
      title: "This week only",
      data: {
        headline: "First 3 customers — small bonus",
        detail: "Order this week and I'll throw in something extra. Tell me you saw the page.",
        until: "this Sunday",
      },
      message: `Want a promo banner for your first week? Urgency works — "first 3 customers" is a real reason to act today, not next month.`,
      quickReplies: ["Add it", "Make it stronger", "Not yet"],
    },
    {
      type: "about-extra",
      title: "Why I started this",
      data: {
        heading: "A bit more about me",
        body: `I started ${offerName} because I noticed people kept asking me for the same kind of help. I take one customer at a time so I can do it well.`,
      },
      message: `Let's add a short "about me" paragraph. Two sentences is enough — it makes the page feel like a person, not a brochure.`,
      quickReplies: ["Add it", "Different angle", "Not yet"],
    },
    {
      type: "service",
      title: "Another option",
      data: {
        name: `${offerName} — bigger package`,
        description: "A larger version for customers who want more than the starter.",
        priceUSD: (shop.offer?.priceUSD || 25) * 4,
        priceLocal: `USD ${(shop.offer?.priceUSD || 25) * 4}`,
        deliveryWindow: "Within 2 weeks",
      },
      message: `Let's add a second option — a bigger package for customers who want more. Even just two price points doubles your average sale.`,
      quickReplies: ["Add it", "Different price", "Not yet"],
    },
    {
      type: "social",
      title: "Find me here too",
      data: {
        links: [
          { platform: "Instagram", url: "" },
          { platform: "TikTok", url: "" },
        ],
      },
      message: `Want to link your other accounts? Instagram and TikTok are the easiest ways for new customers to recognise you.`,
      quickReplies: ["Add it", "Just one for now", "Not yet"],
    },
  ];

  const next = candidates.find((c) => !existing.includes(c.type)) || candidates[turn % candidates.length];

  return {
    message: next.message,
    proposedSection: { type: next.type, title: next.title, data: next.data },
    quickReplies: next.quickReplies,
    notice: turn === 0 ? "Running in offline mode — set ANTHROPIC_API_KEY for real adaptive suggestions." : null,
  };
}
