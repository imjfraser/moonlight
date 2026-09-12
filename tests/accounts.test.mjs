import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { readFile } from "node:fs/promises";
import { migrate } from "../app/lib/migrations.mjs";
import { issueMagicLink,consumeMagicLink,findSessionAccount,revokeSession,setAccountStatus,provisionAdmin,tokenHash,MAGIC_LINK_TTL_MS,SESSION_TTL_MS } from "../app/lib/account-store.mjs";
import { sendLoginEmail } from "../app/lib/auth-email.mjs";
const setup=()=>{const db=new Database(":memory:");db.pragma("foreign_keys=ON");migrate(db);return db;};
test("verified signup creates one canonical identity; raw links/sessions never stored; cross-device login reuses identity",()=>{
 const db=setup();try{
 const now=1000,token=issueMagicLink(db,"  Person@Example.test ","user",now);
 assert.equal(db.prepare("SELECT count(*) n FROM accounts").get().n,0);
 assert.equal(db.prepare("SELECT token_hash FROM auth_magic_links").get().token_hash,tokenHash(token));
 const first=consumeMagicLink(db,token,"user",now+1);assert.ok(first);assert.equal(first.account.role,"user");assert.equal(first.account.enrollmentTier,"free");
 assert.equal(db.prepare("SELECT token_hash FROM auth_sessions").get().token_hash,tokenHash(first.sessionToken));
 assert.equal(consumeMagicLink(db,token,"user",now+2),null);
 const next=consumeMagicLink(db,issueMagicLink(db,"person@example.test","user",now+3),"user",now+4);
 assert.equal(first.account.id,next.account.id);assert.equal(db.prepare("SELECT count(*) n FROM participants").get().n,1);
 assert.equal(findSessionAccount(db,first.sessionToken,"user",now+5).id,first.account.id);
 assert.equal(findSessionAccount(db,first.sessionToken,"admin",now+5),null);
 }finally{db.close();}
});
test("expiry, logout and disable revoke access; disabled accounts cannot sign in; reenabling does not revive tokens",()=>{
 const db=setup();try{
 const now=1000;const expired=issueMagicLink(db,"expired@example.test","user",now);
 assert.equal(consumeMagicLink(db,expired,"user",now+MAGIC_LINK_TTL_MS),null);
 const signed=consumeMagicLink(db,issueMagicLink(db,"person@example.test","user",now),"user",now+1);
 assert.equal(findSessionAccount(db,signed.sessionToken,"user",now+1+SESSION_TTL_MS),null);
 const outstanding=issueMagicLink(db,signed.account.email,"user",now+2);
 assert.equal(setAccountStatus(db,signed.account.id,"disabled",now+3).status,"disabled");
 assert.equal(findSessionAccount(db,signed.sessionToken,"user",now+4),null);
 assert.equal(consumeMagicLink(db,outstanding,"user",now+4),null);
 assert.equal(issueMagicLink(db,signed.account.email,"user",now+4),null);
 setAccountStatus(db,signed.account.id,"active",now+5);assert.equal(findSessionAccount(db,signed.sessionToken,"user",now+6),null);
 const fresh=consumeMagicLink(db,issueMagicLink(db,signed.account.email,"user",now+7),"user",now+8);
 revokeSession(db,fresh.sessionToken,"user",now+9);assert.equal(findSessionAccount(db,fresh.sessionToken,"user",now+10),null);
 }finally{db.close();}
});
test("admin audience requires controlled provisioning and cannot grant private participant access or be disabled through user management",()=>{
 const db=setup();try{
 const now=1000;assert.equal(issueMagicLink(db,"unknown@example.test","admin",now),null);
 const admin=provisionAdmin(db,"admin@example.test",now);
 assert.equal(issueMagicLink(db,admin.email,"user",now),null);
 const token=issueMagicLink(db,admin.email,"admin",now);
 assert.equal(consumeMagicLink(db,token,"user",now+1),null);
 const signed=consumeMagicLink(db,token,"admin",now+2);assert.equal(signed.account.role,"admin");
 assert.equal(findSessionAccount(db,signed.sessionToken,"user",now+3),null);
 assert.equal(findSessionAccount(db,signed.sessionToken,"admin",now+3).id,admin.id);
 assert.equal(setAccountStatus(db,admin.id,"disabled",now+4),null);
 const user=consumeMagicLink(db,issueMagicLink(db,"participant@example.test","user",now),"user",now+1);
 assert.throws(()=>provisionAdmin(db,user.account.email,now+2),/cannot_be_promoted/);
 provisionAdmin(db,user.account.email,now+3,{promoteExisting:true});assert.equal(findSessionAccount(db,user.sessionToken,"user",now+4),null);
 }finally{db.close();}
});
test("web auth ignores legacy participant-id cookies, separates roles and requires same Origin on writes",async()=>{
 const db=setup();const now=Date.now();const user=consumeMagicLink(db,issueMagicLink(db,"user@example.test","user",now),"user",now);
 const admin=provisionAdmin(db,"admin@example.test",now);const adminSession=consumeMagicLink(db,issueMagicLink(db,admin.email,"admin",now),"admin",now);
 let cookieMap={ll_pid:user.account.id};
 globalThis.__accountAuthTest={cookies:async()=>({get:key=>cookieMap[key]?{value:cookieMap[key]}:undefined}),getDb:()=>db,findSessionAccount,SESSION_TTL_MS};
 try{
 const source=(await readFile(new URL("../app/lib/auth.mjs",import.meta.url),"utf8")).replace(/^import .*;\n/gm,"");
 const auth=await import("data:text/javascript;base64,"+Buffer.from("const {cookies,getDb,findSessionAccount,SESSION_TTL_MS}=globalThis.__accountAuthTest;\n"+source).toString("base64"));
 assert.equal(await auth.getAuthenticatedAccount(),null);
 cookieMap={__Host_ll_session:user.sessionToken};assert.equal(await auth.getAuthenticatedAccount(),null);
 cookieMap={"__Host-ll_session":user.sessionToken};assert.equal((await auth.requireUser()).id,user.account.id);
 const handler=auth.withUser(()=>Response.json({ok:true}));
 assert.equal((await handler(new Request("https://luzdeluna.app/api/state",{method:"PUT",headers:{Origin:"https://evil.test"}}))).status,403);
 assert.equal((await handler(new Request("https://luzdeluna.app/api/state",{method:"PUT",headers:{Origin:"https://luzdeluna.app"}}))).status,200);
 cookieMap={"__Host-ll_admin_session":adminSession.sessionToken};
 await assert.rejects(auth.requireUser);assert.equal((await auth.requireAdmin()).id,admin.id);
 const cookies=[];auth.setSessionCookie({cookies:{set:(...args)=>cookies.push(args)}},"token","user");
 assert.equal(cookies[0][2].secure,true);assert.equal(cookies[0][2].httpOnly,true);assert.equal(cookies[0][2].path,"/");
 }finally{delete globalThis.__accountAuthTest;db.close();}
});
test("magic-link email uses authorized sender and Moonlight fragment URL; provider calls are mocked",async()=>{
 let sent;await sendLoginEmail({email:"synthetic@example.test",token:"a".repeat(43),audience:"user",lang:"es",origin:"https://luzdeluna.app"},
 {env:{RESEND_API_KEY:"synthetic-not-real"},fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return {ok:true};}});
 assert.equal(sent.from,"Luz de Luna <moonlight@pegasuscompanion.com>");
 assert.ok(sent.text.includes("https://luzdeluna.app/login#token="));assert.ok(!sent.text.includes("?token="));
 await assert.rejects(()=>sendLoginEmail({email:"synthetic@example.test",token:"x",audience:"user",origin:"https://luzdeluna.app"},{env:{}}),/email_unavailable/);
});
