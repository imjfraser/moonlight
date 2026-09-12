import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {migrate} from '../app/lib/migrations.mjs';
import {setAccountStatus,issueMagicLink,consumeMagicLink,findSessionAccount,provisionAdmin} from '../app/lib/account-store.mjs';
const Database=createRequire(import.meta.url)('better-sqlite3');
const source=await readFile(new URL('../app/api/admin/users/[id]/route.js',import.meta.url),'utf8');
const factory=new Function('requireAdmin','requireSameOrigin','authErrorResponse','setAccountStatus','getDb',source.replace(/^import .*;\n/gm,'').replace(/export /g,'')+';return POST;');
const errorResponse=e=>Response.json({error:e.code||'internal_error'},{status:e.status||500});
const denied=()=>Object.assign(new Error('denied'),{code:'admin_authentication_required',status:401});
function route(db,allow=true) {
 let reads=0;
 return {post:factory(async()=>{if(!allow)throw denied();},req=>{if(req.headers.get('origin')!=='https://luzdeluna.app')throw Object.assign(Error('origin'),{status:403});},errorResponse,setAccountStatus,()=>{reads++;return db;}),reads:()=>reads};
}
function req(status='disabled',origin='https://luzdeluna.app') {return new Request('https://luzdeluna.app/api/admin/users/test',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:'status='+status});}
function fixture(t){const db=new Database(':memory:');db.pragma('foreign_keys=ON');migrate(db);t.after(()=>db.close());return db;}
test('admin mutation rejects anonymous and participant boundary before management DB or body reads',async()=>{
 for(const audience of ['anonymous','participant']) {
  const r=route(null,false);
  const response=await r.post({headers:new Headers(),get body(){throw Error('body accessed before auth');}},{params:Promise.resolve({id:'00000000-0000-0000-0000-000000000000'})});
  assert.equal(response.status,401,audience);assert.equal(r.reads(),0);
 }
});
test('admin mutation rejects cross-origin and invalid requests before management DB',async()=>{
 const r=route(null);
 for(const [request,id,code] of [[req('disabled','https://foreign.test'),'00000000-0000-0000-0000-000000000000',403],[req(),'bad',400],[req('admin'),'00000000-0000-0000-0000-000000000000',400],[req('x'.repeat(600)),'00000000-0000-0000-0000-000000000000',413]]) {
  assert.equal((await r.post(request,{params:Promise.resolve({id})})).status,code);
 }
 assert.equal(r.reads(),0);
});
test('admin route disable/enable uses real atomic store, revokes sessions and links, excludes admin targets',async t=>{
 const db=fixture(t),now=Date.now();
 const user=consumeMagicLink(db,issueMagicLink(db,'route@example.test','user',now),'user',now+1);
 const pending=issueMagicLink(db,'route@example.test','user',now+2);
 const r=route(db),params={params:Promise.resolve({id:user.account.id})};
 const disabled=await r.post(req(),params);
 assert.equal(disabled.status,303);assert.equal(disabled.headers.get('location'),'/admin/users/'+user.account.id);
 assert.equal(db.prepare('SELECT status FROM accounts WHERE participant_id=?').get(user.account.id).status,'disabled');
 assert.equal(findSessionAccount(db,user.sessionToken,'user',now+3),null);
 assert.equal((await r.post(req('active'),params)).status,303);
 assert.equal(findSessionAccount(db,user.sessionToken,'user',now+4),null);
 assert.equal(consumeMagicLink(db,pending,'user',now+4),null);
 const admin=provisionAdmin(db,'admin-route@example.test',now);
 assert.equal((await r.post(req(),{params:Promise.resolve({id:admin.id})})).status,404);
 assert.equal(db.prepare('SELECT status FROM accounts WHERE participant_id=?').get(admin.id).status,'active');
 assert.equal((await r.post(req(),{params:Promise.resolve({id:'00000000-0000-0000-0000-000000000000'})})).status,404);
});
