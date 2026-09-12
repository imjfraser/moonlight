// Canonical participant identity now comes only from a revocable user session.
// Legacy ll_pid bearer ids and anonymous browser caches cannot authenticate.
import { requireUser } from "./auth.mjs";
export async function resolveParticipant() { return (await requireUser()).id; }
export { participantCacheScope } from "./cache-scope.mjs";
