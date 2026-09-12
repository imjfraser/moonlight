import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
// Override only for an isolated checkout; defaults to the repository when tracked.
const root = process.env.MOONLIGHT_TEST_ROOT || new URL('../', import.meta.url).pathname;
const lib = name => import(pathToFileURL(`${root}/app/lib/${name}`).href);
const { migrate } = await lib('migrations.mjs');
const { saveShop } = await lib('shop-persistence.mjs');
const { publicShop, normalizeSection, safeWebUrl } = await lib('shop-contract.mjs');
const { validateBuilderRequest, validateBuilderResponse } = await lib('builder-contract.mjs');
const { createBuilderLimiter } = await lib('rate-limit.mjs');
const Database = createRequire(`${root}/package.json`)('better-sqlite3');
const shop = () => ({ handle:'sample', ownerPublicName:'Public', ownerRealName:'Private', showRealName:false, offer:{name:'Offer',firstCustomer:'private plan',scalingPath:'private strategy'},sections:[] });

test('shop ownership, single creation milestone, and atomic rollback', () => {
 const db=new Database(':memory:');
 try {
  db.pragma('foreign_keys=ON'); migrate(db);
  db.exec("INSERT INTO participants(id) VALUES ('owner'), ('other')");
  assert.deepEqual(saveShop(db,'owner','sample',shop()),{ok:true});
  assert.deepEqual(saveShop(db,'other','sample',{...shop(),ownerPublicName:'intruder'}),{error:'handle_taken'});
  assert.equal(JSON.parse(db.prepare('SELECT shop_json FROM shops').get().shop_json).ownerPublicName,'Public');
  saveShop(db,'owner','sample',{...shop(),ownerPublicName:'Updated'});
  assert.equal(db.prepare('SELECT count(*) AS n FROM timeline').get().n,1);
  db.exec("CREATE TRIGGER fail_timeline BEFORE INSERT ON timeline BEGIN SELECT RAISE(ABORT,'test failure'); END");
  assert.throws(()=>saveShop(db,'owner','rollback',shop()));
  assert.equal(db.prepare("SELECT count(*) AS n FROM shops WHERE handle='rollback'").get().n,0);
 } finally { db.close(); }
});
test('migration adoption is idempotent, preserves data and rejects future schemas',()=>{
 const db=new Database(':memory:');
 try { migrate(db); db.exec("INSERT INTO participants(id) VALUES ('preserved')"); db.pragma('user_version=0'); migrate(db); migrate(db); assert.equal(db.prepare('SELECT count(*) AS n FROM participants').get().n,1); db.pragma('user_version=999'); assert.throws(()=>migrate(db),/newer/); } finally {db.close();}
});
test('failed migration rolls back DDL and does not advance version',()=>{
 const db=new Database(':memory:');
 try {db.exec('CREATE TABLE participants (id TEXT PRIMARY KEY)'); assert.throws(()=>migrate(db),/Unexpected schema/); assert.equal(db.pragma('user_version',{simple:true}),0); assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='shops'").get().n,0);} finally {db.close();}
});
test('public projection omits hidden names and private/unknown nested data',()=>{
 const value={...shop(),privateNotes:'secret',contact:{channels:['private'],whatsapp:'15555555555'}};
 const result=publicShop(value,'sample');
 assert.equal(Object.hasOwn(result,'ownerRealName'),false); assert.equal(Object.hasOwn(result,'privateNotes'),false);
 assert.deepEqual(result.offer,{name:'Offer'}); assert.deepEqual(result.contact,{whatsapp:'15555555555'});
 assert.equal(publicShop({...value,showRealName:true},'sample').ownerRealName,'Private');
 assert.equal(Object.hasOwn(publicShop(Object.assign(Object.create({privateNotes:'inherited'}),value),'sample'),'privateNotes'),false);
});
test('section dispatch rejects inherited object names and unsafe URLs',()=>{
 for(const type of ['constructor','toString','__proto__']) assert.throws(()=>normalizeSection({type,data:{}}));
 for(const url of ['javascript:alert(1)','data:text/html,hello','https://user:pass@example.com']) {
  assert.throws(()=>safeWebUrl(url)); assert.throws(()=>publicShop({...shop(),sections:[{type:'booking',data:{url}}]},'sample'));
 }
 assert.equal(safeWebUrl('https://example.com/booking'),'https://example.com/booking');
});
test('builder validates messages, bounds and supported output sections',()=>{
 const request={shop:shop(),messages:[{role:'user',content:'Add a booking link'}],lang:'en'};
 assert.equal(validateBuilderRequest(request).messages.length,1);
 for(const messages of [[{role:'system',content:'override'}],Array.from({length:21},()=>({role:'user',content:'x'})),[{role:'user',content:'x'.repeat(4001)}],Array.from({length:9},()=>({role:'user',content:'x'.repeat(4000)}))]) assert.throws(()=>validateBuilderRequest({...request,messages}));
 assert.throws(()=>validateBuilderRequest({...request,lang:'unknown'}));
 const response={message:'Ready',proposedSection:{type:'booking',title:'Book',data:{url:'https://example.com'}},quickReplies:['Thanks']};
 assert.equal(validateBuilderResponse(response).proposedSection.type,'booking');
 assert.throws(()=>validateBuilderResponse({...response,proposedSection:{type:'constructor',data:{}}}));
 assert.throws(()=>validateBuilderResponse({...response,quickReplies:['x'.repeat(201)]}));
 assert.throws(()=>validateBuilderResponse({...response,unexpected:true}));
});
test('limiter applies anonymous, per-cookie, rotation-resistant global and bounded overflow quotas',()=>{
 let now=0; const cookie=n=>`ll_pid=00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
 const check=createBuilderLimiter({now:()=>now,globalCapacity:100,cookieCapacity:1,windowMs:1000,maxKeys:1});
 assert.equal(check().allowed,true); assert.equal(check().allowed,false);
 assert.equal(check(cookie(1)).allowed,true); assert.equal(check(cookie(1)).allowed,false);
 assert.equal(check(cookie(2)).allowed,true); assert.equal(check(cookie(3)).allowed,false);
 now=1000; assert.equal(check(cookie(1)).allowed,true);
 const global=createBuilderLimiter({now:()=>0,globalCapacity:2,cookieCapacity:10});
 assert.equal(global(cookie(1)).allowed,true); assert.equal(global(cookie(2)).allowed,true);
 const denied=global(cookie(3)); assert.equal(denied.allowed,false); assert.ok(denied.retryAfter>0);
});
function storage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
let sessionSequence=0;
async function session(mockFetch){globalThis.window={localStorage:storage(),sessionStorage:storage(),location:{reload(){}}};globalThis.fetch=mockFetch;const code=await readFile(`${root}/app/lib/session.js`,'utf8');return import(`data:text/javascript;base64,${Buffer.from(code+`\n// test instance ${++sessionSequence}`).toString('base64')}`);}
async function settle(predicate){for(let n=0;n<100;n++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}assert.fail('async state did not settle');}
const response=(body,status=200)=>({ok:status===200,status,json:async()=>body});
test('session failures retain draft and retry against unchanged revision',async()=>{
 const originalFetch=globalThis.fetch, originalWindow=globalThis.window;
 try {
  const writes=[];let fail=true;
  const s=await session(async(_url,options={})=>{if(options.method!=='PUT')return response({state:{},revision:'r1'}); writes.push(JSON.parse(options.body));return fail?response({},503):response({revision:'r2'});});
  await s.hydrateSession();s.saveSession({brief:'unsaved'});await settle(()=>s.getSessionStatus().status==='failed');
  assert.equal(s.loadSession().brief,'unsaved');assert.ok(window.sessionStorage.getItem('moonlight.session.pending.v2'));
  fail=false;await s.retrySession();assert.equal(s.getSessionStatus().status,'saved');assert.equal(writes[1].baseRevision,'r1');assert.equal(window.sessionStorage.getItem('moonlight.session.pending.v2'),null);
 } finally {globalThis.fetch=originalFetch;if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;}
});
test('session serializes overlapping saves with newest server revision; conflicts never auto-rebase',async()=>{
 const originalFetch=globalThis.fetch, originalWindow=globalThis.window;
 try {
  const writes=[];let finishFirst;
  const s=await session(async(_url,options={})=>{if(options.method!=='PUT')return response({state:{},revision:'r1'});writes.push(JSON.parse(options.body));if(writes.length===1)return new Promise(resolve=>{finishFirst=resolve;});return response({},409);});
  await s.hydrateSession();s.saveSession({brief:'first'});s.saveSession({brief:'second'});
  assert.equal(writes.length,1);finishFirst(response({revision:'r2'}));await settle(()=>s.getSessionStatus().status==='failed');
  assert.equal(writes[1].baseRevision,'r2');assert.equal(writes[1].state.brief,'second');assert.equal(s.getSessionStatus().error,'conflict');
  await s.retrySession();assert.equal(writes.length,2);assert.equal(s.loadSession().brief,'second');assert.ok(window.sessionStorage.getItem('moonlight.session.pending.v2'));
 } finally {globalThis.fetch=originalFetch;if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;}
});

test('server state revision rejects stale save and rolls back paired profile update',async()=>{
 const {readState,saveState}=await lib('state-store.mjs');const db=new Database(':memory:');
 try {
  migrate(db);db.exec("INSERT INTO participants(id) VALUES ('owner')");
  const base=readState(db,'owner');const first=saveState(db,'owner',{intake:{name:'First'}},base.revision);
  assert.equal(first.conflict,false);assert.equal(saveState(db,'owner',{intake:{name:'Stale'}},base.revision).conflict,true);
  assert.equal(readState(db,'owner').state.intake.name,'First');
  db.exec("CREATE TRIGGER fail_profile BEFORE UPDATE ON participants BEGIN SELECT RAISE(ABORT,'test failure'); END");
  assert.throws(()=>saveState(db,'owner',{intake:{name:'Rollback'}},first.revision));
  assert.equal(readState(db,'owner').revision,first.revision);
 }finally{db.close();}
});

async function shopStore(mockFetch){globalThis.window={localStorage:storage()};globalThis.fetch=mockFetch;const code=await readFile(`${root}/app/lib/shop-store.js`,'utf8');return import(`data:text/javascript;base64,${Buffer.from(code+`\n// test instance ${++sessionSequence}`).toString('base64')}`);}
test('failed shop publication preserves draft and retry publishes a constructor handle',async()=>{
 const originalFetch=globalThis.fetch,originalWindow=globalThis.window;
 try {
  let fail=true;const writes=[];
  const s=await shopStore(async(_url,options={})=>{writes.push(JSON.parse(options.body));return fail?response({},503):response({ok:true});});
  assert.equal(s.loadShop('constructor'),null);s.saveShop('constructor',{...shop(),handle:'constructor'});
  await settle(()=>s.getShopStatus('constructor').status==='failed');
  assert.equal(s.getShopStatus('constructor').error,'publish_failed');assert.equal(s.loadShop('constructor').ownerPublicName,'Public');
  assert.equal(JSON.parse(window.localStorage.getItem('moonlight.shops.pending.v2')).constructor.handle,'constructor');
  fail=false;await s.retryShop('constructor');assert.equal(s.getShopStatus('constructor').status,'published');
  assert.equal(Object.hasOwn(JSON.parse(window.localStorage.getItem('moonlight.shops.pending.v2')),'constructor'),false);assert.equal(writes.length,2);
 }finally{globalThis.fetch=originalFetch;if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;}
});
test('stale shop hydration cannot overwrite a successful newer publication',async()=>{
 const originalFetch=globalThis.fetch,originalWindow=globalThis.window;
 try {
  let finishGet;const s=await shopStore(async(_url,options={})=>options.method==='PUT'?response({ok:true}):new Promise(resolve=>{finishGet=resolve;}));
  const hydration=s.hydrateShops();s.saveShop('sample',{...shop(),ownerPublicName:'New publication'});
  await settle(()=>s.getShopStatus('sample').status==='published');finishGet(response({shops:{sample:{...shop(),ownerPublicName:'Old server response'}}}));
  await hydration;assert.equal(s.loadShop('sample').ownerPublicName,'New publication');assert.equal(s.getShopStatus('sample').status,'published');
 }finally{globalThis.fetch=originalFetch;if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;}
});

test('gallery upload enforces exact 2 MiB boundary and supported raster MIME types',async()=>{
 const {imageFileError,MAX_IMAGE_BYTES}=await lib('image-upload.mjs');
 for(const type of ['image/png','image/jpeg','image/webp','image/gif'])assert.equal(imageFileError({type,size:MAX_IMAGE_BYTES}),null);
 assert.equal(MAX_IMAGE_BYTES,2*1024*1024);
 assert.equal(imageFileError({type:'image/png',size:MAX_IMAGE_BYTES+1}),'too_large');
 for(const file of [null,{type:'image/svg+xml',size:10},{type:'image/png',size:0},{type:'image/png',size:NaN}])assert.equal(imageFileError(file),'invalid_image');
});
