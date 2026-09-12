import { createBuilderLimiter } from "./rate-limit.mjs";
// Separate quota namespace: coach traffic never consumes the builder bucket.
const key = Symbol.for("moonlight.coach.limiter.v1");
globalThis[key] ??= createBuilderLimiter();
export const checkCoachLimit = globalThis[key];
