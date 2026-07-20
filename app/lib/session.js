// Participant journey state for Luz de Luna.
//
// Durable store is server-side SQLite (see /api/state). The browser keeps a
// synchronous localStorage cache so screens can read/write without awaiting,
// and every save is written through to the server. hydrateSession(), called
// once on app boot, reconciles the two so a returning participant resumes.
//
// localStorage (not sessionStorage) is used deliberately: it survives refresh
// and browser close on the same device even before the server round-trips.

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
  ideas: null, // generated set
  brief: null,
  kit: null,
};

function readCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(s) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function loadSession() {
  if (typeof window === "undefined") return structuredClone(defaultSession);
  const cached = readCache();
  if (!cached) return structuredClone(defaultSession);
  return { ...structuredClone(defaultSession), ...cached };
}

export function saveSession(s) {
  if (typeof window === "undefined") return;
  writeCache(s);
  pushState(s);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
  pushState({});
}

function pushState(state) {
  try {
    fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    }).catch(() => {});
  } catch {}
}

// Called once at app boot. Reconciles the browser cache with the server:
//   - server has data  -> adopt it locally (returning participant / durability)
//   - server empty but cache has data -> push cache up (first server-backed run)
export async function hydrateSession() {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/state", { method: "GET" });
    if (!res.ok) return;
    const { state } = await res.json();
    const hasServer = state && Object.keys(state).length > 0;
    const cache = readCache();
    if (hasServer) {
      writeCache(state);
      window.dispatchEvent(new Event("moonlight:hydrated"));
    } else if (cache) {
      pushState(cache);
    }
  } catch {}
}
