import test from "node:test";
import assert from "node:assert/strict";
import { programProgress, programSquares } from "../app/lib/program-progress.mjs";
test("seven squares distinguish observed, current, skipped and future stages",()=>{
 const squares=programSquares(programProgress({coachState:"offer_proposal",coachConversation:[{role:"assistant",state:"greeting"},{role:"assistant",state:"first_customer_id"}]}));
 assert.equal(squares.length,7);
 assert.deepEqual(squares.map(s=>s.squareStatus),["completed","upcoming","completed","current","upcoming","upcoming","upcoming"]);
 assert.equal(squares.filter(s=>s.current).length,1);
});
test("current done stays outlined until real artifact and publication readiness",()=>{
 const raw={coachState:"done",proposedOffer:{name:"Offer",description:"Description",priceUSD:5},draftedMessage:"Hello",marketingPlan:{daily:"Action",weekly:"Review",thirtyDayGoal:"Goal"},shopHandle:"example"};
 for(const status of ["ready","saving","failed"])assert.equal(programSquares(programProgress(raw,status))[6].squareStatus,"current");
 const ready=programSquares(programProgress(raw,"published"));
 assert.equal(ready[6].squareStatus,"completed");assert.equal(ready[6].current,true);
 // Complete artifacts do not invent evidence of earlier skipped coaching stages.
 assert.ok(ready.slice(0,6).every(s=>s.squareStatus==="upcoming"));
});
test("a previously observed done stage does not fill if launch materials are incomplete",()=>{
 const squares=programSquares(programProgress({coachState:"marketing_plan",coachConversation:[{role:"assistant",state:"done"}]},"published"));
 assert.equal(squares[6].squareStatus,"upcoming");assert.equal(squares[5].squareStatus,"current");
});
