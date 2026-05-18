// Tiny client-side "session" — keeps the participant's answers and choices
// across screens using sessionStorage. Survives navigation; clears on close.
// No real user data; this is a prototype.

const KEY = "moonlight.session.v1";

export const defaultSession = {
  intake: {
    name: "",
    publicName: "",
    skills: "",
    askedFor: "",
    offerType: "service",
    hoursPerWeek: "5-10",
    channels: ["WhatsApp"],
    safetyNotes: "",
    showRealName: false,
  },
  selectedIdea: null, // one of architect.ideas
  ideas: null,        // generated set
  brief: null,
  kit: null,
};

export function loadSession() {
  if (typeof window === "undefined") return defaultSession;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return structuredClone(defaultSession);
    return { ...structuredClone(defaultSession), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultSession);
  }
}

export function saveSession(s) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}
