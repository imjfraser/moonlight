// Moonlight coach API route.
// Receives intake + conversation history and returns Sol's next message
// as a structured JSON object (see app/lib/coach-prompt.js for the schema).
//
// Expects ANTHROPIC_API_KEY in the environment.
// Falls back to a small handcrafted offline coach if the key is missing,
// so the demo doesn't break on day one.

import Anthropic from "@anthropic-ai/sdk";
import { COACH_SYSTEM_PROMPT } from "../../lib/coach-prompt";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export const runtime = "nodejs";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const { intake, messages } = body || {};
  if (!intake || !Array.isArray(messages)) {
    return Response.json({ error: "missing_intake_or_messages" }, { status: 400 });
  }

  // Compose the user-side context (intake snapshot) as a system-augmenting prefix.
  const intakeContext = formatIntake(intake);

  if (!process.env.ANTHROPIC_API_KEY) {
    // Offline fallback — gives the UI something to render in dev / when the
    // key isn't set yet. The first reply nudges James to add the key.
    return Response.json(offlineFallback(intake, messages));
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Anthropic requires at least one message. The first turn of the
    // conversation is initiated by the UI before the user has typed anything
    // (so Sol can greet by name) — synthesise a kickoff user message in
    // that case.
    const messagesForClaude = messages.length > 0
      ? messages.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: "Please start the conversation by greeting me by my name from the intake and asking the opening question for the greeting state." }];

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `${COACH_SYSTEM_PROMPT}\n\nHER INTAKE:\n${intakeContext}`,
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
        message: "Sorry — let me try that again. Could you say that one more time?",
        state: lastState(messages) || "greeting",
        quickReplies: null,
        raw: text,
        error: "model_returned_non_json",
      });
    }
    return Response.json(parsed);
  } catch (err) {
    console.error("coach api error", err);
    return Response.json(
      {
        message:
          "Sorry — I lost my connection for a moment. Let me know when you're ready to keep going.",
        state: lastState(messages) || "greeting",
        quickReplies: ["Let's keep going", "Start over"],
        error: "upstream_error",
      },
      { status: 200 }, // return 200 so the UI keeps the conversation alive
    );
  }
}

function formatIntake(intake) {
  const lines = [];
  if (intake.name) lines.push(`Name she goes by: ${intake.name}`);
  if (intake.publicName) lines.push(`Public name preference: ${intake.publicName}`);
  if (typeof intake.showRealName === "boolean")
    lines.push(`Wants real name shown publicly: ${intake.showRealName ? "yes" : "no"}`);
  if (intake.skills) lines.push(`What she's good at, in her words: ${intake.skills}`);
  if (intake.askedFor) lines.push(`What people already ask her for: ${intake.askedFor}`);
  if (intake.offerType) lines.push(`Offer type she's leaning toward: ${intake.offerType}`);
  if (intake.hoursPerWeek) lines.push(`Hours per week available: ${intake.hoursPerWeek}`);
  if (Array.isArray(intake.channels) && intake.channels.length)
    lines.push(`Channels she can use: ${intake.channels.join(", ")}`);
  if (intake.safetyNotes) lines.push(`Privacy preferences: ${intake.safetyNotes}`);
  return lines.join("\n");
}

function safeParseJson(text) {
  if (!text) return null;
  // Strip code fences if the model added them despite instructions.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find the first {...} block.
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function lastState(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && m.state) return m.state;
  }
  return null;
}

// Offline fallback coach — gives a useful experience even before
// ANTHROPIC_API_KEY is configured. State machine matches the schema.
function offlineFallback(intake, messages) {
  const turn = messages.filter((m) => m.role === "user").length;
  const name = (intake.name || "friend").split(" ")[0];
  const skill = (intake.skills || intake.askedFor || "what you're already good at").split(/[,.]/)[0];
  const publicName = intake.publicName || name;

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
      message: `Good. So your ${skill} is the thing. Now — could you imagine doing this for someone outside your neighbourhood? Like, an office that wants lunch once a week, or someone online who'd pay in dollars?`,
      state: "skill_exploration",
      quickReplies: ["Yes, I could", "I'm not sure", "Tell me more"],
    };
  }
  if (turn === 2) {
    return {
      message: `Think of one person you already know — a friend, a neighbour, a former co-worker — who would say yes if you offered them this today. Who is it?`,
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
        scalingPath: `Start with this one customer at USD 25. Once you've delivered to 3 customers, raise to USD 40. To reach USD 2,500/month from this skill, you'll likely want to package it for online clients — for example, ${skill} sessions for international customers who pay in USD, or a small monthly package (USD 300+) for repeat clients. We'll plan that next.`,
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
    message: `Your page is ready: /shop/${slugify(publicName)}. Share that link when people ask. Now — go send the message. Talk soon.`,
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
    .slice(0, 40) || "shop";
}
