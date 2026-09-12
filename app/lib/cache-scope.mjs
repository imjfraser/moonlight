import { createHash } from "node:crypto";

// Public cache partition metadata, NOT an authentication token or account id.
// All surfaces derive this from the same canonical participant after resolving
// their own authenticated identity. No schema or new data collection is needed.
export function participantCacheScope(participantId) {
  return createHash("sha256").update("moonlight:participant-cache:v1:").update(participantId).digest("hex");
}
