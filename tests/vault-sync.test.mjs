import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm,readFile,lstat,symlink} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
import {installVaultSchema,markVaultDirty,syncVaultParticipant,exportPrivateVault} from '../app/lib/vault-sync.mjs';
const Database=createRequire(import.meta.url)('better-sqlite3');
const {migrate}=await import('../app/lib/migrations.mjs');
const id='11111111-1111-4111-8111-111111111111';
function db(){const db=new Database(':memory:');db.pragma('foreign_keys=ON');migrate(db);db.exec("CREATE TABLE IF NOT EXISTS accounts(participant_id TEXT PRIMARY KEY,email TEXT,role TEXT,status TEXT DEFAULT 'active')");db.prepare('INSERT INTO participants(id) VALUES (?)').run(id);db.prepare('INSERT INTO accounts(participant_id,email,role) VALUES (?,?,?)').run(id,'synthetic@example.test','user');installVaultSchema(db);return db;}
test('outbox rollback, local-only deterministic Git sync, meaningful revision commits',async()=>{
 const d=db(),root=await mkdtemp(path.join(os.tmpdir(),'moonlight-vault-test-'));
 try{
  assert.throws(()=>d.transaction(()=>{markVaultDirty(d,id);throw Error('rollback');})());assert.equal(d.prepare('SELECT COUNT(*) AS n FROM participant_vault_sync').get().n,0);
  d.prepare('INSERT INTO participant_state(participant_id,state_json) VALUES (?,?)').run(id,JSON.stringify({coachConversation:[{role:'user',content:'SYNTHETIC_PRIVATE'}]}));markVaultDirty(d,id);
  const a=await syncVaultParticipant(d,root,id);assert.equal(a.status,'synced');assert.match(a.commit,/^[a-f0-9]{40,64}$/);assert.ok((await readFile(path.join(root,id,'conversation.md'),'utf8')).includes('SYNTHETIC_PRIVATE'));
  assert.equal((await lstat(path.join(root,id))).mode&0o777,0o700);assert.equal((await lstat(path.join(root,id,'conversation.md'))).mode&0o777,0o600);
  markVaultDirty(d,id);const b=await syncVaultParticipant(d,root,id);assert.equal(b.commit,a.commit);assert.equal((await syncVaultParticipant(d,root,id)).status,'idle');
  d.prepare('UPDATE participant_state SET state_json=? WHERE participant_id=?').run(JSON.stringify({coachConversation:[{role:'user',content:'CHANGED_PRIVATE'}]}),id);markVaultDirty(d,id);const c=await syncVaultParticipant(d,root,id);assert.notEqual(c.commit,a.commit);
  const config=await readFile(path.join(root,id,'.git','config'),'utf8');assert.equal(config.includes('[remote '),false);
 }finally{d.close();await rm(root,{recursive:true,force:true});}
});
test('symlink path fails safely without leaking raw error, queue remains retryable',async()=>{
 const d=db(),root=await mkdtemp(path.join(os.tmpdir(),'moonlight-vault-test-'));
 try{await symlink(os.tmpdir(),path.join(root,id));markVaultDirty(d,id);const r=await syncVaultParticipant(d,root,id);assert.deepEqual(r,{status:'failed',error:'sync_failed'});const row=d.prepare('SELECT * FROM participant_vault_sync').get();assert.equal(row.completed_generation,0);assert.equal(row.last_error_code,'sync_failed');}finally{d.close();await rm(root,{recursive:true,force:true});}
});

test('new generation queued during export survives acknowledgement; parallel worker cannot claim same repo',async()=>{
 const d=db(),root=await mkdtemp(path.join(os.tmpdir(),'moonlight-vault-test-'));
 try{
  markVaultDirty(d,id);const first=syncVaultParticipant(d,root,id);
  d.prepare('INSERT INTO participant_state(participant_id,state_json) VALUES (?,?)').run(id,JSON.stringify({coachConversation:[{role:'user',content:'NEWER_SYNTHETIC'}]}));markVaultDirty(d,id);
  assert.equal((await syncVaultParticipant(d,root,id)).status,'idle');assert.equal((await first).status,'synced');
  let row=d.prepare('SELECT * FROM participant_vault_sync').get();assert.equal(row.requested_generation,2);assert.equal(row.completed_generation,1);
  assert.equal((await syncVaultParticipant(d,root,id)).status,'synced');row=d.prepare('SELECT * FROM participant_vault_sync').get();assert.equal(row.completed_generation,2);assert.ok((await readFile(path.join(root,id,'conversation.md'),'utf8')).includes('NEWER_SYNTHETIC'));
 }finally{d.close();await rm(root,{recursive:true,force:true});}
});
test('malformed snapshot failure is sanitized and does not complete queued generation',async()=>{
 const d=db(),root=await mkdtemp(path.join(os.tmpdir(),'moonlight-vault-test-'));
 try{d.prepare('INSERT INTO participant_state(participant_id,state_json) VALUES (?,?)').run(id,'{PRIVATE_INVALID');markVaultDirty(d,id);assert.deepEqual(await syncVaultParticipant(d,root,id),{status:'failed',error:'sync_failed'});const row=d.prepare('SELECT * FROM participant_vault_sync').get();assert.equal(row.completed_generation,0);assert.equal(row.last_error_code,'sync_failed');assert.equal(row.lease_token,null);}finally{d.close();await rm(root,{recursive:true,force:true});}
});

test('participant export contains ZIP bytes; disabled/admin accounts cannot export private vault',async()=>{
 const d=db(),root=await mkdtemp(path.join(os.tmpdir(),'moonlight-vault-test-'));
 try{markVaultDirty(d,id);const archive=await exportPrivateVault(d,root,id);assert.equal(archive.subarray(0,2).toString(),'PK');d.exec("UPDATE accounts SET status='disabled'");await assert.rejects(()=>exportPrivateVault(d,root,id),/forbidden/);d.exec("UPDATE accounts SET status='active',role='admin'");await assert.rejects(()=>exportPrivateVault(d,root,id),/forbidden/);}finally{d.close();await rm(root,{recursive:true,force:true});}
});
