import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { consumeAuthFragment, authPaths, authPost } from "../app/lib/login-flow.mjs";
const token="a".repeat(43);
test("fragment is removed before use and invalid/duplicate tokens are cleared",()=>{
  let cleared;
  const location={hash:"#token="+token,pathname:"/login",search:"?lang=es"};
  assert.equal(consumeAuthFragment(location,{replaceState:(_,__,url)=>cleared=url}),token);
  assert.equal(cleared,"/login?lang=es");
  for(const hash of ["#token=short","#token="+token+"&token="+token]){
    cleared=null;assert.throws(()=>consumeAuthFragment({...location,hash},{replaceState:(_,__,url)=>cleared=url}),/invalid_token/);assert.ok(cleared);
  }
});
test("user/admin endpoints independent, credentials same-origin, redirects fixed",async()=>{
  for(const admin of [false,true]){
    let called;
    const result=await authPost(admin,"verify",{token},async(url,options)=>{
      called={url,options};return {ok:true,json:async()=>({authenticated:true,redirect:"https://evil.example"})};
    });
    assert.equal(called.url,authPaths(admin).base+"/verify");assert.equal(called.options.credentials,"same-origin");assert.equal(result.destination,admin?"/admin":"/architect");
    assert.equal(JSON.parse(called.options.body).token,token);
  }
});
test("generic sent response and bounded sanitized errors",async()=>{
  assert.deepEqual(await authPost(false,"request",{email:"test@example.com"},async()=>({ok:true,json:async()=>({sent:true})})),{sent:true});
  await assert.rejects(authPost(false,"request",{},async()=>({ok:false,headers:new Headers(),json:async()=>({error:"PRIVATE ERROR CONTENT"})})),e=>e.message==="request_failed");
  await assert.rejects(authPost(false,"request",{},async()=>({ok:false,headers:new Headers({"Retry-After":"999999"}),json:async()=>({error:"rate_limited"})})),e=>e.message==="rate_limited"&&e.retryAfter===3600);
});
test("Strict Mode consumes token once and unmounted verify cannot navigate",async()=>{
  const require=createRequire(import.meta.url);
  const Parser=require("acorn").Parser.extend(require("acorn-jsx")());
  const source=readFileSync(new URL("../app/components/LoginForm.jsx",import.meta.url),"utf8");
  const ast=Parser.parse(source,{ecmaVersion:"latest",sourceType:"module"});
  const component=ast.body.find(n=>n.type==="ExportDefaultDeclaration").declaration;
  const effect=component.body.body.find(n=>n.type==="ExpressionStatement"&&n.expression.callee?.name==="useEffect").expression.arguments[0];
  function context(){
    let calls=0,destination=null,cleared=false;
    const ctx={admin:false,link:{current:undefined},started:{current:false},request:{current:null},
      consumeAuthFragment,authPaths,authPost,AbortController,queueMicrotask,
      setStatus:()=>{},showError:()=>{},window:{location:{hash:"#token="+token,pathname:"/login",search:"",assign:value=>destination=value},history:{replaceState:()=>{cleared=true;}}},
      fetch:async()=>{assert.ok(cleared);calls++;return {ok:true,json:async()=>({authenticated:true})};}};
    vm.createContext(ctx);vm.runInContext("globalThis.effect="+source.slice(effect.start,effect.end),ctx);
    return {ctx,calls:()=>calls,destination:()=>destination};
  }
  const h=context(),cleanup=h.ctx.effect();cleanup();h.ctx.effect();await new Promise(r=>setImmediate(r));assert.equal(h.calls(),1);assert.equal(h.destination(),"/architect");
  const late=context();let resolve;late.ctx.fetch=()=>new Promise(r=>resolve=r);const leave=late.ctx.effect();await new Promise(r=>setImmediate(r));leave();resolve({ok:true,json:async()=>({authenticated:true})});await new Promise(r=>setImmediate(r));assert.equal(late.destination(),null);
});
