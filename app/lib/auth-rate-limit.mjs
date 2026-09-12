import { createHash } from "node:crypto";
const namespace=Symbol.for("moonlight.auth.rate-limit.v1");
globalThis[namespace] ||= {global:{tokens:60,at:Date.now()},emails:new Map(),overflow:{tokens:3,at:Date.now()}};
function consume(bucket,capacity,windowMs,now) {
  bucket.tokens=Math.min(capacity,bucket.tokens+Math.max(0,now-bucket.at)*capacity/windowMs);bucket.at=now;
  if(bucket.tokens<1)return Math.max(1,Math.ceil((1-bucket.tokens)*windowMs/capacity/1000));
  bucket.tokens-=1;return 0;
}
export function checkAuthRateLimit(email=null,now=Date.now()) {
  const state=globalThis[namespace];
  const globalWait=consume(state.global,60,60000,now);
  if(globalWait)return globalWait;
  if(!email)return 0;
  const key=createHash("sha256").update(email).digest("hex");
  let bucket=state.emails.get(key);
  if(!bucket){
    for(const [oldKey,oldBucket]of state.emails)if(now-oldBucket.at>30*60000)state.emails.delete(oldKey);
    if(state.emails.size<2048){bucket={tokens:3,at:now};state.emails.set(key,bucket);}else bucket=state.overflow;
  }
  return consume(bucket,3,15*60000,now);
}
