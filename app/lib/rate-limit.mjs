// Single-process guardrails, not distributed quotas or account authentication.
// A process-wide bucket always applies, including when callers rotate cookies.
import { createHash } from "node:crypto";

export function createBuilderLimiter({ now = Date.now, globalCapacity = 60, cookieCapacity = 10, windowMs = 60000, maxKeys = 1024 } = {}) {
  const make = capacity => ({ tokens: capacity, at: now(), lastSeen: now() });
  const globalBucket = make(globalCapacity);
  const anonymous = make(cookieCapacity);
  const overflow = make(cookieCapacity);
  const buckets = new Map();
  function consume(bucket, capacity, time) {
    bucket.tokens = Math.min(capacity, bucket.tokens + Math.max(0, time - bucket.at) * capacity / windowMs);
    bucket.at = time; bucket.lastSeen = time;
    if (bucket.tokens < 1) return Math.max(1, Math.ceil((1 - bucket.tokens) * windowMs / capacity / 1000));
    bucket.tokens -= 1;
    return 0;
  }
  return function check(cookieHeader = "") {
    const time = now();
    const globalWait = consume(globalBucket, globalCapacity, time);
    if (globalWait) return { allowed: false, retryAfter: globalWait };
    const match = /(?:^|;\s*)ll_pid=([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:;|$)/i.exec(cookieHeader);
    let bucket = anonymous;
    if (match) {
      const key = createHash("sha256").update(match[1].toLowerCase()).digest("hex");
      bucket = buckets.get(key);
      if (!bucket) {
        if (buckets.size >= maxKeys) {
          for (const [oldKey, oldBucket] of buckets) {
            if (time - oldBucket.lastSeen >= windowMs * 10) buckets.delete(oldKey);
          }
        }
        if (buckets.size < maxKeys) { bucket = make(cookieCapacity); buckets.set(key, bucket); }
        else bucket = overflow;
      }
    }
    const retryAfter = consume(bucket, cookieCapacity, time);
    return { allowed: retryAfter === 0, retryAfter };
  };
}

const limiterKey = Symbol.for("moonlight.builder.limiter.v1");
globalThis[limiterKey] ??= createBuilderLimiter();
export const checkBuilderLimit = globalThis[limiterKey];
