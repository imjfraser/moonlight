import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {migrate,SCHEMA_VERSION} from '../app/lib/migrations.mjs';
import {issueMagicLink,consumeMagicLink} from '../app/lib/account-store.mjs';
import {readState,saveState} from '../app/lib/state-store.mjs';
const Database=createRequire(import.meta.url)('better-sqlite3');
test('v4 journey telemetry commits atomically only for meaningful successful state changes',()=>{
 const db=new Database(':memory:');db.pragma('foreign_keys=ON');
 try {
  migrate(db);assert.equal(db.pragma('user_version',{simple:true}),SCHEMA_VERSION);migrate(db);
  const {account}=consumeMagicLink(db,issueMagicLink(db,'metrics@example.test'));
  const id=account.id,state={coachConversation:[{role:'user',content:'PRIVATE_MARKER'}],coachState:'greeting'};
  const initial=readState(db,id).revision;
  const saved=saveState(db,id,state,initial);assert.equal(saved.conflict,false);
  const row=()=>db.prepare('SELECT * FROM admin_program_sessions WHERE participant_id=?').get(id);
  assert.ok(row());const first=row();
  saveState(db,id,state,saved.revision);assert.deepEqual(row(),first);
  assert.equal(saveState(db,id,{...state,coachState:'done'},initial).conflict,true);assert.equal(row().completed_at,null);
  assert.throws(()=>db.transaction(()=>{saveState(db,id,{...state,coachState:'done'},saved.revision);throw Error('rollback');})());
  assert.equal(row().completed_at,null);assert.equal(readState(db,id).revision,saved.revision);
  saveState(db,id,{...state,coachState:'done'},saved.revision);assert.ok(row().completed_at);
  assert.ok(!JSON.stringify(row()).includes('PRIVATE_MARKER'));
 }finally{db.close();}
});
