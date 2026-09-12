import fs from "node:fs";
import assert from "node:assert/strict";
import { validateCoachRequest, validateCoachResponse, boundedCoachHistory } from "../app/lib/coach-contract.mjs";
import { coachMemoryContext, buildCoachMessages } from "../app/lib/coach-context.mjs";
import test from "node:test";
test("coach validation, canonical context, identity isolation and provider failures", async () => {
const previousKey = process.env.ANTHROPIC_API_KEY;
try {
const scope = "a".repeat(64);
const offer = { name: "Design package", tagline: "Ready this week", description: "Three designs", priceUSD: 25, priceLocal: "USD 25", deliveryWindow: "Friday", firstCustomer: "Ana", scalingPath: "More packages" };
const plan = { primaryChannel: "WhatsApp", secondaryChannel: "Instagram", daily: "One post", weekly: "Five offers", aiToolsToUse: ["Canva"], examplePostHook: "Hello", thirtyDayGoal: "Five customers" };
const body = { cacheScope: scope, intake: { name: "Test", skills: "Design", safetyNotes: "Chosen privacy note", showRealName: false }, messages: [], lang: "es" };
assert.equal(validateCoachRequest(body).intake.safetyNotes, body.intake.safetyNotes);
for (const messages of [[{role:"system",content:"bad"}], [{role:"user",content:"x".repeat(4001)}], Array.from({length:41},()=>({role:"user",content:"ok"})), Array.from({length:17},()=>({role:"user",content:"x".repeat(4000)}))]) {
  assert.throws(()=>validateCoachRequest({...body,messages}));
}
assert.throws(()=>validateCoachRequest({...body, cacheScope:null}));
assert.throws(()=>validateCoachResponse({message:{bad:true},state:"greeting"}));
assert.throws(()=>validateCoachResponse({message:"Hi",state:"not_valid"}));
assert.throws(()=>validateCoachResponse({message:"Hi",state:"marketing_plan",marketingPlan:{...plan,aiToolsToUse:123}}));
assert.throws(()=>validateCoachResponse({message:"Hi",state:"done",shopHandle:"javascript:bad"}));
for (const state of ["greeting","skill_exploration","first_customer_id","offer_proposal","action_drafted","marketing_plan","done"]) {
  assert.equal(validateCoachResponse({message:"Hi",state,proposedOffer:offer,marketingPlan:plan}).state,state);
}
const history=Array.from({length:100},(_,i)=>({role:i%2?"assistant":"user",content:"x".repeat(2000),...(i%2?{state:"offer_proposal",proposedOffer:offer}: {})}));
const saved=JSON.stringify(history);
const bounded=boundedCoachHistory(history);
assert.ok(bounded.length<=40);
assert.ok(bounded.reduce((sum,m)=>sum+JSON.stringify(m).length,0)<=64000);
assert.equal(JSON.stringify(history),saved);
assert.equal(bounded.at(-1).proposedOffer.priceUSD,25);
validateCoachRequest({...body,messages:bounded});
const memory={coachState:"marketing_plan",proposedOffer:offer,marketingPlan:plan,coachConversation:[{role:"assistant",state:"action_drafted",draftedMessage:"Hello Ana"}]};
assert.equal(coachMemoryContext(memory).draftedMessage,"Hello Ana");
const providerMessages=buildCoachMessages({...body,messages:[{role:"assistant",content:"Here's the offer",state:"offer_proposal",proposedOffer:{...offer,priceUSD:40}},{role:"user",content:"Continue"}]},memory);
assert.equal(providerMessages[0].role,"user");
assert.ok(providerMessages[0].content.includes('"priceUSD":25'));
assert.ok(providerMessages[1].content.includes('"priceUSD":40'));
assert.ok(providerMessages[0].content.includes("participant-provided context"));
let mode="valid", sdkCalls=0, stateReads=0, sdkOptions, sdkRequest;
globalThis.__coachSDK=class{constructor(options){sdkOptions=options;this.messages={create:async input=>{sdkCalls++;sdkRequest=input;if(mode==="timeout")throw Object.assign(Error("PRIVATE"),{name:"APIConnectionTimeoutError"});if(mode==="error")throw Error("PRIVATE");return {content:[{type:"text",text:mode==="invalid"?"PRIVATE":mode==="shape"?JSON.stringify({message:{bad:1},state:"no"}):JSON.stringify({message:"Hi",state:"marketing_plan",proposedOffer:offer,marketingPlan:plan})}]};}};}};
globalThis.__coachDeps={
resolveParticipant:async()=>"test-participant",
participantCacheScope:()=>scope,
getDb:()=>({}),
readState:()=>{stateReads++;return {state:memory}},
};
let source=fs.readFileSync(new URL("../app/api/coach/route.js",import.meta.url),"utf8")
.replace('import { withUser } from "../../lib/auth.mjs";', "const withUser=handler=>handler;")
.replace('import Anthropic from "@anthropic-ai/sdk";',"const Anthropic=globalThis.__coachSDK;")
.replace('import { COACH_SYSTEM_PROMPT } from "../../lib/coach-prompt";','const COACH_SYSTEM_PROMPT="UNCHANGED PROMPT TEST";')
.replace('import { getDb } from "../../lib/db";',"const {getDb}=globalThis.__coachDeps;")
.replace('import { resolveParticipant, participantCacheScope } from "../../lib/participant";',"const {resolveParticipant,participantCacheScope}=globalThis.__coachDeps;")
.replace('import { readState } from "../../lib/state-store.mjs";',"const {readState}=globalThis.__coachDeps;")
.replaceAll('"../../lib/', '"' + new URL("../app/lib/", import.meta.url).href);
const {POST}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
let id=0;
const request=value=>new Request("http://test/coach",{method:"POST",headers:{cookie:"ll_pid=00000000-0000-0000-0000-"+String(id++).padStart(12,"0")},body:typeof value==="string"?value:JSON.stringify(value)});
process.env.ANTHROPIC_API_KEY="test-not-real";
let res=await POST(request({...body,cacheScope:"b".repeat(64)}));assert.equal(res.status,409);assert.equal(stateReads,0);assert.equal(sdkCalls,0);
res=await POST(request({...body,messages:[{role:"system",content:"bad"}]}));assert.equal(res.status,400);assert.equal(stateReads,0);
res=await POST(request("{"));assert.equal(res.status,400);
res=await POST(request("x".repeat(1024*1024+1)));assert.equal(res.status,413);
res=await POST(request({...body,messages:[{role:"user",content:"Continue"}]}));assert.equal(res.status,200);assert.equal(sdkOptions.timeout,60000);assert.equal(sdkOptions.maxRetries,0);assert.equal(sdkRequest.messages[0].role,"user");
assert.ok(sdkRequest.messages[0].content.includes('"priceUSD":25'));
assert.ok(!sdkRequest.system.includes('"priceUSD":25'));
mode="invalid";res=await POST(request(body));assert.equal(res.status,502);assert.deepEqual(await res.json(),{error:"invalid_coach_response"});
mode="shape";res=await POST(request(body));assert.equal(res.status,502);
mode="error";res=await POST(request(body));assert.equal(res.status,502);assert.deepEqual(await res.json(),{error:"upstream_error"});
mode="timeout";res=await POST(request(body));assert.equal(res.status,504);
delete process.env.ANTHROPIC_API_KEY;
for(let turn=0;turn<7;turn++){
 res=await POST(request({...body,messages:Array.from({length:turn},()=>({role:"user",content:"Continue"}))}));
 assert.equal(res.status,200,"offline turn "+turn);validateCoachResponse(await res.json());
}
res=await POST(request({...body,intake:{name:"a".repeat(500),publicName:"b".repeat(500),skills:"c".repeat(8000)},messages:Array.from({length:3},()=>({role:"user",content:"Continue"}))}));assert.equal(res.status,200);
console.log("PASS coach contracts, bounded unmodified full transcript, canonical+latest artifact context, scope409 before reads/provider,400/413, all7 states, normalized offline output,60s/no retries, private upstream502/model502/timeout504.");

} finally {
  if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = previousKey;
  delete globalThis.__coachSDK;
  delete globalThis.__coachDeps;
}
});
