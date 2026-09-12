import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const fs=require("fs"),assert=require("node:assert/strict"),vm=require("node:vm");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const req=require("node:module").createRequire(path.resolve(__dirname,"../package.json"));
const Parser=req("acorn").Parser.extend(req("acorn-jsx")());
const root=path.resolve(__dirname,"..")+path.sep;
require("node:test")("coach continuity, identity and publication boundaries", async()=>{
 const helpers=await import(pathToFileURL(root+"app/lib/coach-journey.mjs"));
 const {publicShop}=await import(pathToFileURL(root+"app/lib/shop-contract.mjs"));
 const source=fs.readFileSync(root+"app/architect/page.jsx","utf8");
 const ast=Parser.parse(source,{ecmaVersion:"latest",sourceType:"module"});
 Parser.parse(fs.readFileSync(root+"app/components/CoachPublication.jsx","utf8"),{ecmaVersion:"latest",sourceType:"module"});
 const component=ast.body.find(n=>n.type==="ExportDefaultDeclaration").declaration;
 const functions=component.body.body.filter(n=>n.type==="FunctionDeclaration").map(n=>source.slice(n.start,n.end)).join("\n");
 const firstEffect=component.body.body.find(n=>n.type==="ExpressionStatement"&&n.expression.callee?.name==="useEffect").expression.arguments[0];
 const initial={intake:{name:"Private Full Name",publicName:"",showRealName:false,skills:"cook"},coachConversation:[{role:"assistant",content:"Offer",proposedOffer:{name:"Cake",priceUSD:25}},{role:"assistant",content:"Ready",state:"done",shopHandle:"cake"}],marketingPlan:{daily:"Send message"},coachState:"done"};
 assert.equal(helpers.journeyView(initial).proposedOffer.name,"Cake");
 assert.equal(helpers.journeyView(initial).marketingPlan.daily,"Send message");
 const edited={offer:{name:"OWNER EDIT"},sections:[{id:"keep"}],contact:{whatsapp:"15551234567"},showRealName:false};
 assert.equal(helpers.missingShopDraft(initial,edited),null);
 const fresh=helpers.missingShopDraft(initial,null);
 assert.equal(JSON.stringify(publicShop(fresh,"cake")).includes("Private Full Name"),false);
 const reset=helpers.resetCoachJourney(initial);assert.equal(helpers.journeyView(reset).shopHandle,null);assert.equal(reset.coachConversation.length,0);
 function harness(session=initial){
  let saved=structuredClone(session),scope="A",calls=0,publications=[],invalidated=false;
  const ctx={...helpers,AbortController,JSON,Math,console,window:{confirm:()=>true},navigator:{clipboard:{writeText:async()=>{}}},lang:"en",t:k=>k,
   saveReady:true,subscribeSession:()=>()=>{},getSessionStatus:()=>({status:"saved"}),mounted:{current:true},request:{current:null},scrollRef:{current:null},draft:"hello",draftedMessage:null,marketingPlan:null,
   loadSession:()=>saved,saveSession:n=>{saved=n;},getSessionCacheScope:()=>scope,invalidateSessionIdentity:()=>{invalidated=true;scope=undefined;},
   boundedCoachHistory:h=>h,hydrateShops:async()=>{},getShopStatus:()=>({status:"ready"}),loadShop:()=>edited,
   saveShop:(h,s)=>publications.push(s),retryShop:async()=>{},fetch:async()=>{calls++;return {ok:true,json:async()=>({message:"Reply",state:"done"})};},
  };
  for(const name of ["setS","setMessages","setState","setQuickReplies","setProposedOffer","setDraftedMessage","setShopHandle","setSkillGapAdvice","setMarketingPlan","setReady","setPending","setErrorMsg","setDraft"])ctx[name]=()=>{};
  vm.createContext(ctx);vm.runInContext(functions,ctx);
  return {ctx,saved:()=>saved,setScope:v=>scope=v,publications,calls:()=>calls,invalidated:()=>invalidated};
 }
 const h=harness();h.ctx.send("My user turn");assert.equal(h.saved().coachConversation.at(-1).content,"My user turn");await new Promise(r=>setImmediate(r));assert.equal(h.saved().coachConversation.at(-1).content,"Reply");assert.equal(h.publications.length,0);
 const failed=harness();failed.ctx.fetch=async()=>{throw new Error("offline");};failed.ctx.send("Keep this");await new Promise(r=>setImmediate(r));const length=failed.saved().coachConversation.length;await failed.ctx.retryTurn();await new Promise(r=>setImmediate(r));assert.equal(failed.saved().coachConversation.length,length);assert.equal(failed.saved().coachConversation.at(-1).content,"Keep this");
 for(const boundary of ["fetch","json"]){
  const late=harness();let release;late.ctx.fetch=boundary==="fetch"?()=>new Promise(r=>release=()=>r({ok:true,json:async()=>({message:"LATE",state:"done"})})):async()=>({ok:true,json:()=>new Promise(r=>release=()=>r({message:"LATE",state:"done"}))});
  const running=late.ctx.sendToCoach(late.saved());await new Promise(r=>setImmediate(r));late.setScope("B");release();await running;assert.ok(!JSON.stringify(late.saved()).includes("LATE"));assert.equal(late.publications.length,0);
 }
 const unmounted=harness();let respond;unmounted.ctx.fetch=()=>new Promise(r=>respond=r);const running=unmounted.ctx.sendToCoach();await new Promise(r=>setImmediate(r));unmounted.ctx.mounted.current=false;respond({ok:true,json:async()=>({message:"LATE"})});await running;assert.ok(!JSON.stringify(unmounted.saved()).includes("LATE"));
 const init=harness({intake:{name:"Person"},coachConversation:[]});vm.runInContext("globalThis.initialEffect="+source.slice(firstEffect.start,firstEffect.end),init.ctx);const cleanup=init.ctx.initialEffect();cleanup();init.ctx.initialEffect();await new Promise(r=>setImmediate(r));assert.equal(init.calls(),1);
 const empty=harness({intake:{},coachConversation:[]});vm.runInContext("globalThis.initialEffect="+source.slice(firstEffect.start,firstEffect.end),empty.ctx);empty.ctx.initialEffect();await new Promise(r=>setImmediate(r));assert.equal(empty.calls(),0);
 await assert.rejects(helpers.waitForJourneySave(()=>()=>{},()=>({status:"saving"}),undefined,5),/journey_save_timeout/);
 let transient="ready",checkSave,finished=false;
 const transientWait=helpers.waitForJourneySave(fn=>{checkSave=fn;return ()=>{};},()=>({status:transient}),undefined,1000).then(()=>{finished=true;});
 transient="saving";await new Promise(r=>setImmediate(r));assert.equal(finished,false);
 transient="saved";checkSave();await transientWait;assert.equal(finished,true);
 const waiting=harness();let status="saving",listener;
 waiting.ctx.getSessionStatus=()=>({status});
 waiting.ctx.subscribeSession=fn=>{listener=fn;return ()=>{};};
 const waitingTurn=waiting.ctx.sendToCoach();
 await new Promise(r=>setImmediate(r));assert.equal(waiting.calls(),0);
 status="saved";listener();await waitingTurn;assert.equal(waiting.calls(),1);
 const blocked=harness();blocked.ctx.getSessionStatus=()=>({status:"failed"});
 await blocked.ctx.sendToCoach();assert.equal(blocked.calls(),0);
 blocked.ctx.saveReady=false;blocked.ctx.send("Cannot continue while reset unsaved");assert.equal(blocked.saved().coachConversation.length,initial.coachConversation.length);
 const abortedWait=harness();abortedWait.ctx.getSessionStatus=()=>({status:"saving"});
 const suspended=abortedWait.ctx.sendToCoach();abortedWait.ctx.request.current.abort();await suspended;assert.equal(abortedWait.calls(),0);
 const publication=harness();
 publication.ctx.loadShop=()=>null;
 publication.ctx.getShopStatus=()=>({status:"failed",error:"load_failed"});
 await publication.ctx.recoverPublication();assert.equal(publication.publications.length,0);
 publication.ctx.getShopStatus=()=>({status:"ready",error:null});
 await publication.ctx.recoverPublication();assert.equal(publication.publications.length,1);
 const recover=harness();let retries=0;
 recover.ctx.getShopStatus=handle=>handle?({status:"failed",error:"publish_failed"}):({status:"ready"});
 recover.ctx.retryShop=async()=>{retries++;};
 await recover.ctx.recoverPublication();assert.equal(recover.publications.length,0);assert.equal(retries,1);
 const panel=fs.readFileSync(root+"app/components/CoachPublication.jsx","utf8");
 assert.ok(panel.includes('state.status === "published" && <Link'));
 assert.ok(panel.includes('state.error === "handle_taken"'));
 assert.ok(!source.includes('state !== "done"'));assert.ok(!source.includes("localStorage"));assert.ok(source.includes("maxLength={4000}"));assert.ok(source.includes("boundedCoachHistory(history)"));
 console.log("PASS restoration, reset, no owner overwrite, public alias privacy, user save before request, duplicate-free retry, scope+unmount late-response guards, StrictMode single kickoff, no-intake no request, continuation and P2 cap preservation");
});
