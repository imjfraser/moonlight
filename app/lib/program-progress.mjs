import { journeyView } from "./coach-journey.mjs";
export const PROGRAM_STAGES = [
  { id: "greeting", en: "Meet Sol", es: "Conoce a Sol", nextEn: "Tell Sol what you want to build.", nextEs: "Cuéntale a Sol qué quieres construir." },
  { id: "skill_exploration", en: "Start with your strengths", es: "Empieza con tus fortalezas", nextEn: "Choose a skill you can offer.", nextEs: "Elige una habilidad que puedas ofrecer." },
  { id: "first_customer_id", en: "Find your first customer", es: "Encuentra a tu primer cliente", nextEn: "Think of one person to contact.", nextEs: "Piensa en una persona a quien contactar." },
  { id: "offer_proposal", en: "Shape your offer and price", es: "Define tu oferta y precio", nextEn: "Review what you will offer and charge.", nextEs: "Revisa qué vas a ofrecer y cobrar." },
  { id: "action_drafted", en: "Prepare your first message", es: "Prepara tu primer mensaje", nextEn: "Make your message sound like you.", nextEs: "Haz que tu mensaje suene a ti." },
  { id: "marketing_plan", en: "Plan your next 30 days", es: "Planea tus próximos 30 días", nextEn: "Choose a small daily marketing action.", nextEs: "Elige una pequeña acción diaria de marketing." },
  { id: "done", en: "Review your launch kit", es: "Revisa tu kit de lanzamiento", nextEn: "Check your materials, then take your next step with Sol.", nextEs: "Revisa tus materiales y da tu siguiente paso con Sol." },
];
const text = value => typeof value === "string" && value.trim().length > 0;
export function programProgress(session, publicationStatus = "ready") {
  const view = journeyView(session || {});
  const index = Math.max(0, PROGRAM_STAGES.findIndex(stage => stage.id === view.state));
  const observed = new Set(view.messages.filter(m => m.role === "assistant").map(m => m.state));
  observed.add(PROGRAM_STAGES[index].id);
  const offer = view.proposedOffer;
  const plan = view.marketingPlan;
  const artifacts = {
    offer: !!(offer && text(offer.name) && text(offer.description) &&
      (text(offer.priceLocal) || (typeof offer.priceUSD === "number" && Number.isFinite(offer.priceUSD) && offer.priceUSD >= 0))),
    message: text(view.draftedMessage),
    plan: !!(plan && text(plan.daily) && text(plan.weekly) && text(plan.thirtyDayGoal)),
    shop: text(view.shopHandle) && publicationStatus === "published",
  };
  const arcReviewed = observed.has("done");
  const readyCount = Object.values(artifacts).filter(Boolean).length;
  const needsStage = !artifacts.offer ? "offer_proposal" : !artifacts.message ? "action_drafted" : !artifacts.plan ? "marketing_plan" : "done";
  return {
    current: PROGRAM_STAGES[index],
    next: PROGRAM_STAGES[index + 1] || PROGRAM_STAGES.find(stage => stage.id === needsStage),
    stages: PROGRAM_STAGES.map(stage => ({ ...stage, status: stage.id === PROGRAM_STAGES[index].id ? "current" : observed.has(stage.id) ? "visited" : "upcoming" })),
    artifacts, readyCount, arcReviewed, graduationReady: arcReviewed && readyCount === 4,
    handle: view.shopHandle,
  };
}

// Squares mark observed coaching stages, not inferred sales or skipped steps.
export function programSquares(progress) {
  return progress.stages.map(stage => ({
    ...stage,
    current: stage.id === progress.current.id,
    squareStatus: stage.id === "done"
      ? (progress.graduationReady ? "completed" : stage.id === progress.current.id ? "current" : "upcoming")
      : stage.id === progress.current.id ? "current" : stage.status === "visited" ? "completed" : "upcoming",
  }));
}
