import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { participantCacheScope } from '../app/lib/cache-scope.mjs';
import { migrate } from '../app/lib/migrations.mjs';
import { readState, saveState, validateStateWrite, MAX_STATE_BYTES } from '../app/lib/state-store.mjs';
import { saveShop } from '../app/lib/shop-persistence.mjs';
import { normalizeShop, normalizeHandle, SHOP_BODY_LIMIT } from '../app/lib/shop-contract.mjs';
import { readRequestJson } from '../app/lib/request-json.mjs';
const Database = createRequire(import.meta.url)('better-sqlite3');
const root = new URL('../', import.meta.url);
const A=participantCacheScope('synthetic-a'), B=participantCacheScope('synthetic-b');
let seq=0;
const url=code=>'data:text/javascript;base64,'+Buffer.from(code+`\n// instance ${++seq}`).toString('base64');
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const response=(value,status=200)=>({ok:status===200,status,json:async()=>value});
const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(resolve=>setImmediate(resolve));}assert.fail('async operation did not settle');};
async function clients(fetch, local=storage(), tab=storage()) {
 const window={localStorage:local,sessionStorage:tab,location:{reload(){}}};
 globalThis.window=window;globalThis.fetch=fetch;
 const sessionUrl=url(await readFile(new URL('app/lib/session.js',root),'utf8'));
 const session=await import(sessionUrl);
 const shops=await import(url((await readFile(new URL('app/lib/shop-store.js',root),'utf8')).replace('"./session"',JSON.stringify(sessionUrl))));
 return {session,shops,window,fetch};
}
const originalWindow=globalThis.window, originalFetch=globalThis.fetch;
// Tests in this file run sequentially; restore globals after all module mocks.
test.after(()=>{globalThis.fetch=originalFetch;if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;});

test('cache partition stable for canonical participant, distinct and noncredential',()=>{
 assert.equal(A,participantCacheScope('synthetic-a'));assert.match(A,/^[a-f0-9]{64}$/);assert.notEqual(A,B);assert.notEqual(A,'synthetic-a');
});
test('legacy unbound caches remain untouched and never display or auto-upload',async()=>{
 const local=storage(),tab=storage();const legacy=JSON.stringify({intake:{name:'Prior person'}}),oldShops=JSON.stringify({old:{handle:'old',ownerRealName:'Prior person'}});
 local.setItem('moonlight.session.v1',legacy);local.setItem('moonlight.shops',oldShops);local.setItem('moonlight.shops.pending.v2',oldShops);tab.setItem('moonlight.session.pending.v2',legacy);
 const writes=[];const {session,shops}=await clients(async(route,options={})=>{if(options.method==='PUT'){writes.push(options);return response({ok:true,revision:'r2'});}return response(route==='/api/state'?{state:null,revision:'r1',cacheScope:B}:{shops:{},cacheScope:B});},local,tab);
 assert.equal(session.loadSession().intake.name,'');assert.equal(shops.loadShop('old'),null);
 await session.hydrateSession();await shops.hydrateShops();assert.equal(writes.length,0);assert.equal(session.loadSession().intake.name,'');assert.equal(shops.loadShop('old'),null);
 assert.equal(local.getItem('moonlight.session.v1'),legacy);assert.equal(local.getItem('moonlight.shops'),oldShops);assert.equal(local.getItem('moonlight.shops.pending.v2'),oldShops);assert.equal(tab.getItem('moonlight.session.pending.v2'),legacy);
});
test('cookie identity change rejects pending write and clears both in-memory stores without removing old draft',async()=>{
 let scope=A;const writes=[];
 const c=await clients(async(route,options={})=>{
  if(options.method==='PUT'){writes.push(JSON.parse(options.body));return response({error:'cache_scope_mismatch'},409);}
  return response(route==='/api/state'?{state:{intake:{name:scope===A?'A':'B'}},revision:'r1',cacheScope:scope}:{shops:scope===A?{sample:{handle:'sample'}}:{},cacheScope:scope});
 });
 await c.session.hydrateSession();await c.shops.hydrateShops();assert.ok(c.shops.loadShop('sample'));
 scope=B;c.session.saveSession({intake:{name:'Unsent A'}});await until(()=>c.session.getSessionStatus().error==='identity_changed');
 assert.equal(writes[0].cacheScope,A);assert.equal(c.session.getSessionStatus().ready,false);assert.equal(c.shops.loadShop('sample'),null);assert.equal(c.session.loadSession().intake.name,'');
 assert.ok(c.window.sessionStorage.getItem(`moonlight.session.pending.v3:${A}`));
 await c.session.hydrateSession();assert.equal(c.session.getSessionCacheScope(),undefined);assert.equal(c.session.getSessionStatus().error,'identity_changed');assert.equal(c.session.loadSession().intake.name,'');assert.equal(writes.length,1);
 let reloaded=false;c.window.location.reload=()=>{reloaded=true;};await c.session.retrySession();assert.equal(reloaded,true);
 const fresh=await clients(c.fetch,c.window.localStorage,c.window.sessionStorage);await fresh.session.hydrateSession();await fresh.shops.hydrateShops();assert.equal(fresh.session.loadSession().intake.name,'B');assert.equal(fresh.shops.getShopCacheScope(),B);assert.equal(writes.length,1);
});
test('shop identity mismatch also invalidates journey view and keeps old tab draft',async()=>{
 const c=await clients(async(route,options={})=>options.method==='PUT'?response({error:'cache_scope_mismatch'},409):response(route==='/api/state'?{state:{intake:{name:'A'}},revision:'r1',cacheScope:A}:{shops:{},cacheScope:A}));
 await c.session.hydrateSession();await c.shops.hydrateShops();c.shops.saveShop('sample',{handle:'sample',sections:[]});
 await until(()=>c.session.getSessionStatus().error==='identity_changed');assert.equal(c.shops.loadShop('sample'),null);assert.equal(c.session.getSessionStatus().ready,false);assert.ok(c.window.sessionStorage.getItem(`moonlight.shops.pending.v3:${A}`));
});
test('shop drafts are scoped per-tab: a second tab cannot erase the first draft journal',async()=>{
 const shared=storage();const mock=async(route,options={})=>options.method==='PUT'?response({},503):response(route==='/api/state'?{state:{},revision:'r1',cacheScope:A}:{shops:{},cacheScope:A});
 const a=await clients(mock,shared);await a.session.hydrateSession();await a.shops.hydrateShops();a.shops.saveShop('a',{sections:[]});await until(()=>a.shops.getShopStatus('a').status==='failed');
 const b=await clients(mock,shared);await b.session.hydrateSession();await b.shops.hydrateShops();b.shops.saveShop('b',{sections:[]});await until(()=>b.shops.getShopStatus('b').status==='failed');
 globalThis.window=a.window;globalThis.fetch=a.fetch;a.shops.saveShop('a',{sections:[],offer:{name:'Changed'}});
 assert.ok(JSON.parse(a.window.sessionStorage.getItem(`moonlight.shops.pending.v3:${A}`)).a);
 assert.ok(JSON.parse(b.window.sessionStorage.getItem(`moonlight.shops.pending.v3:${A}`)).b);
 assert.equal(Object.hasOwn(JSON.parse(a.window.sessionStorage.getItem(`moonlight.shops.pending.v3:${A}`)),'b'),false);
});
test('same-scope pending draft survives reload and resumes with matching revision only',async()=>{
 const tab=storage();tab.setItem(`moonlight.session.pending.v3:${A}`,JSON.stringify({state:{intake:{name:'Recovered'}},baseRevision:'r1'}));let writes=0;
 const c=await clients(async(_route,options={})=>{if(options.method==='PUT'){writes++;assert.equal(JSON.parse(options.body).cacheScope,A);return response({revision:'r2'});}return response({state:{},revision:'r1',cacheScope:A});},storage(),tab);
 await c.session.hydrateSession();assert.equal(c.session.loadSession().intake.name,'Recovered');assert.equal(writes,1);assert.equal(tab.getItem(`moonlight.session.pending.v3:${A}`),null);
});
test('GET and PUT routes use cookie identity; missing/wrong scopes reject without state/shop writes',async()=>{
 const db=new Database(':memory:');db.pragma('foreign_keys=ON');migrate(db);db.exec("INSERT INTO participants(id) VALUES ('synthetic-a'), ('synthetic-b')");let id='synthetic-b';
 const globals={withApiMetrics:(_db,handler)=>handler,withUser:handler=>handler,NextResponse:{json:(value,options)=>Response.json(value,options)},getDb:()=>db,resolveParticipant:async()=>id,participantCacheScope,MAX_STATE_BYTES,readState,saveState,validateStateWrite,saveShop,normalizeShop,normalizeHandle,SHOP_BODY_LIMIT,readRequestJson};
 globalThis.__scopeRouteTest=globals;
 async function route(name){const source=await readFile(new URL(`app/api/${name}/route.js`,root),'utf8');return import(url(`const { ${Object.keys(globals).join(',')} } = globalThis.__scopeRouteTest;\n`+source.replace(/^import .*;\n/gm,'')));}
 try {
  const state=await route('state'),shops=await route('shops');assert.equal((await (await state.GET()).json()).cacheScope,B);assert.equal((await (await shops.GET()).json()).cacheScope,B);
  const base=readState(db,id).revision;
  for(const cacheScope of [undefined,A]){
   const r=await state.PUT(new Request('http://test/api/state',{method:'PUT',body:JSON.stringify({state:{intake:{name:'Old A'}},baseRevision:base,cacheScope})}));assert.equal(r.status,409);assert.equal((await r.json()).error,'cache_scope_mismatch');
   const shopResponse=await shops.PUT(new Request('http://test/api/shops',{method:'PUT',body:JSON.stringify({handle:'sample',shop:{handle:'sample'},cacheScope})}));assert.equal(shopResponse.status,409);assert.equal((await shopResponse.json()).error,'cache_scope_mismatch');
  }
  assert.equal(db.prepare('SELECT count(*) AS n FROM participant_state').get().n,0);assert.equal(db.prepare('SELECT count(*) AS n FROM shops').get().n,0);
  const success=await state.PUT(new Request('http://test/api/state',{method:'PUT',body:JSON.stringify({state:{intake:{name:'B'}},baseRevision:base,cacheScope:B})}));assert.equal(success.status,200);assert.equal(readState(db,'synthetic-b').state.intake.name,'B');assert.equal(readState(db,'synthetic-a').state,null);
 }finally{db.close();delete globalThis.__scopeRouteTest;}
});

test('in-flight hydration cannot rebind identity after invalidation',async()=>{
 let finish;const c=await clients(async()=>new Promise(resolve=>{finish=resolve;}));
 const hydration=c.session.hydrateSession();c.session.invalidateSessionIdentity();finish(response({state:{intake:{name:'Late A'}},revision:'r1',cacheScope:A}));await hydration;
 assert.equal(c.session.getSessionCacheScope(),undefined);assert.equal(c.session.getSessionStatus().error,'identity_changed');assert.equal(c.session.loadSession().intake.name,'');
 await c.session.hydrateSession();assert.equal(c.session.getSessionCacheScope(),undefined);
});
test('shops cannot adopt a scope before journey identity is resolved',async()=>{
 const c=await clients(async()=>response({shops:{sample:{handle:'sample'}},cacheScope:A}));
 await c.shops.hydrateShops();assert.equal(c.shops.getShopCacheScope(),undefined);assert.equal(c.shops.loadShop('sample'),null);
});
