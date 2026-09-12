import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {readFile,access} from 'node:fs/promises';
import {migrate} from '../app/lib/migrations.mjs';import {issueMagicLink,consumeMagicLink,setAccountStatus} from '../app/lib/account-store.mjs';import {readState,saveState} from '../app/lib/state-store.mjs';import {saveShop} from '../app/lib/shop-persistence.mjs';
const Database=createRequire(import.meta.url)('better-sqlite3');
test('v3 integrated account/state/shop transactions enqueue only meaningful registered changes',()=>{
 const db=new Database(':memory:');db.pragma('foreign_keys=ON');try{
 migrate(db);assert.ok(db.pragma('user_version',{simple:true})>=3);migrate(db);
 const token=issueMagicLink(db,'synthetic@example.test');const login=consumeMagicLink(db,token);const id=login.account.id;const generation=()=>db.prepare('SELECT requested_generation n FROM participant_vault_sync WHERE participant_id=?').get(id).n;
 assert.equal(generation(),1);const state={intake:{name:'Synthetic'}};const saved=saveState(db,id,state,readState(db,id).revision);assert.equal(saved.conflict,false);assert.equal(generation(),2);saveState(db,id,state,saved.revision);assert.equal(generation(),2);
 saveShop(db,id,'sample',{handle:'sample',offer:{name:'Original'}});assert.equal(generation(),3);saveShop(db,id,'sample',{handle:'sample',offer:{name:'Original'}});assert.equal(generation(),3);saveShop(db,id,'sample',{handle:'sample',offer:{name:'Updated'}});assert.equal(generation(),4);
 setAccountStatus(db,id,'disabled');assert.equal(generation(),5);
 assert.throws(()=>db.transaction(()=>{setAccountStatus(db,id,'active');throw Error('abort');})());assert.equal(generation(),5);
 }finally{db.close();}
});
test('participant export adapter rechecks authentication after async work and never serves bytes on revoked access',async()=>{
 class AuthError extends Error{constructor(message='not_authenticated',status=401){super(message);this.status=status;}}
 let checks=0,exports=0;globalThis.__vaultRoute={AuthError,authErrorResponse:error=>Response.json({error:'not_authenticated'},{status:error.status}),requireUser:async()=>{checks++;if(checks>1)throw new AuthError();return{id:'11111111-1111-4111-8111-111111111111'};},getDb:()=>({}),getVaultRoot:()=>'/synthetic',exportPrivateVault:async()=>{exports++;return Buffer.from('PRIVATE_TRANSCRIPT_BYTES');}};
 const source=await readFile(new URL('../app/api/vault/export/route.js',import.meta.url),'utf8');const code='const { '+Object.keys(globalThis.__vaultRoute).join(',')+' } = globalThis.__vaultRoute;\n'+source.replace(/^import .*;\n/gm,'');
 const route=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));try{const res=await route.GET();assert.equal(res.status,401);assert.equal(checks,2);assert.equal(exports,1);assert.equal((await res.text()).includes('PRIVATE_TRANSCRIPT'),false);}finally{delete globalThis.__vaultRoute;}
});

test('export route relative imports resolve to real staged application files',async()=>{
 const routeUrl=new URL('../app/api/vault/export/route.js',import.meta.url);
 const source=await readFile(routeUrl,'utf8');
 for(const match of source.matchAll(/from ['"](\.[^'"]+)['"]/g)) {
  const target=new URL(match[1].endsWith('.mjs')||match[1].endsWith('.js')?match[1]:match[1]+'.js',routeUrl);
  await access(target);
  assert.ok(target.pathname.includes('/app/lib/'));
 }
});
