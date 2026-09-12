import test from "node:test";
import assert from "node:assert/strict";
import { programProgress, PROGRAM_STAGES } from "../app/lib/program-progress.mjs";
const offer = { name: "Bread", description: "Fresh bread", priceUSD: 0 };
const plan = { daily: "Contact one person", weekly: "Review responses", thirtyDayGoal: "Learn what sells" };
const full = { coachState: "done", proposedOffer: offer, draftedMessage: "Hello! Would you like bread?", marketingPlan: plan, shopHandle: "bread" };
test("seven existing arc states have English and Spanish labels", () => {
  assert.deepEqual(PROGRAM_STAGES.map(s=>s.id), ["greeting","skill_exploration","first_customer_id","offer_proposal","action_drafted","marketing_plan","done"]);
  for (const s of PROGRAM_STAGES) for (const k of ["en","es","nextEn","nextEs"]) assert.ok(s[k]);
});
test("progress labels only observed stages and current, never inferred completed steps", () => {
  const progress=programProgress({coachState:"offer_proposal",coachConversation:[{role:"assistant",state:"greeting"}]});
  assert.equal(progress.current.id,"offer_proposal");
  assert.equal(progress.next.id,"action_drafted");
  assert.equal(progress.stages.find(s=>s.id==="greeting").status,"visited");
  assert.equal(progress.stages.find(s=>s.id==="skill_exploration").status,"upcoming");
  assert.equal(progress.graduationReady,false);
});
test("done alone does not claim artifact readiness or graduation", () => {
  const p=programProgress({coachState:"done",shopHandle:"bread"},"ready");
  assert.equal(p.arcReviewed,true);assert.equal(p.readyCount,0);assert.equal(p.graduationReady,false);
  assert.equal(p.next.id,"offer_proposal");
});
test("all artifacts plus confirmed published shop and observed done required", () => {
  for(const status of ["ready","saving","failed"]) {
    const p=programProgress(full,status);assert.equal(p.artifacts.shop,false);assert.equal(p.graduationReady,false);assert.equal(p.readyCount,3);
  }
  const p=programProgress(full,"published");assert.equal(p.graduationReady,true);assert.equal(p.readyCount,4);
  assert.equal(programProgress({...full,coachState:"marketing_plan"},"published").graduationReady,false);
});
test("restores historical artifacts and retains review milestone during ongoing conversation", () => {
  const p=programProgress({coachState:"skill_exploration",coachConversation:[{role:"assistant",state:"done",proposedOffer:offer,draftedMessage:"Hello",marketingPlan:plan,shopHandle:"bread"},{role:"assistant",state:"skill_exploration"}]},"published");
  assert.equal(p.arcReviewed,true);assert.equal(p.graduationReady,true);assert.equal(p.current.id,"skill_exploration");
});
test("partial or blank artifacts are not ready; readiness does not mutate canonical state", () => {
  const raw={...full,proposedOffer:{name:"Bread"},draftedMessage:"  ",marketingPlan:{daily:"One action"}};
  const before=JSON.stringify(raw),p=programProgress(raw,"published");
  assert.equal(p.readyCount,1);assert.equal(p.graduationReady,false);assert.equal(JSON.stringify(raw),before);
  assert.equal(programProgress({}).current.id,"greeting");
});
