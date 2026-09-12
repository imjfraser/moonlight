import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {migrateAdmin,recordJourney,recordActivity,adminMetrics,supportAccount,withApiMetrics} from '../app/lib/admin-metrics.mjs';
const require=createRequire(import.meta.url),Database=require('better-sqlite3');
function fixture(){const db=new Database(':memory:');db.exec(`CREATE TABLE participants(id TEXT PRIMARY KEY,lang TEXT);CREATE TABLE accounts(participant_id TEXT PRIMARY KEY,email TEXT,status TEXT,role TEXT,enrollment_tier TEXT,created_at TEXT,email_verified_at TEXT);CREATE TABLE shops(participant_id TEXT,handle TEXT);CREATE TABLE participant_state(participant_id TEXT,state_json TEXT);INSERT INTO participants VALUES('user','es');INSERT INTO accounts VALUES('user','user@example.test','active','user','free','2026-09-12','2026-09-12');INSERT INTO accounts VALUES('admin','admin@example.test','active','admin','free','2026-09-12','2026-09-12');INSERT INTO shops VALUES('user','shop');INSERT INTO participant_state VALUES('user','{"coachConversation":[{"content":"PRIVATE-TRANSCRIPT-MARKER"}]}');`);migrateAdmin(db);return db;}
test('admin metrics have exact requested shape, scalar events and no transcript content',()=>{const db=fixture();try{
 const now='2026-09-12T12:00:00.000Z';recordActivity(db,'user','es',now);
 recordJourney(db,'user',{}, {coachConversation:[{role:'user',content:'PRIVATE-TRANSCRIPT-MARKER'}]},now);
 recordJourney(db,'user',{}, {coachState:'done',draftedMessage:'PRIVATE-MESSAGE-MARKER',coachConversation:[{role:'assistant',content:'PRIVATE-TRANSCRIPT-MARKER'}]},'2026-09-12T12:01:00.000Z');
 recordJourney(db,'user',{}, {coachState:'done',draftedMessage:'PRIVATE-MESSAGE-MARKER',coachConversation:[{}]},'2026-09-12T12:02:00.000Z');
 const data=adminMetrics(db,new Date(now));assert.deepEqual(Object.keys(data),['growth','engagement','businessOutcomes','productHealth','monetization','safety']);
 assert.equal(data.growth.signups,1);assert.equal(data.growth.DAU,1);assert.equal(data.engagement.sessionsStarted,1);assert.equal(data.engagement.sessionsCompleted,1);assert.equal(data.engagement.arcCompletionRate,1);assert.ok(Math.abs(data.engagement.averageSessionLengthSeconds-60)<0.01);assert.equal(data.engagement.languageSplit.es,1);assert.equal(data.businessOutcomes.firstCustomerMessageDrafted,1);
 assert.equal(data.safety.acuteDistressDisclosuresHandled,null);assert.equal(data.monetization.MRR,null);
 assert.ok(!JSON.stringify(data).includes('PRIVATE'));assert.ok(!JSON.stringify(supportAccount(db,'user')).includes('PRIVATE'));assert.equal(supportAccount(db,'admin'),null);
 for(const table of ['admin_activity','admin_program_sessions','admin_milestones','admin_counters'])assert.ok(!JSON.stringify(db.prepare(`SELECT * FROM ${table}`).all()).includes('PRIVATE'));
}finally{db.close();}});
test('failed writes roll back telemetry and reset starts a new journey without duplicated outcomes',()=>{const db=fixture();try{
 assert.throws(()=>db.transaction(()=>{recordJourney(db,'user',{}, {coachConversation:[{}],draftedMessage:'secret'});throw Error('rollback');})());assert.equal(db.prepare('SELECT count(*) n FROM admin_program_sessions').get().n,0);
 recordJourney(db,'user',{}, {coachConversation:[{}]},'2026-09-12T00:00:00Z');recordJourney(db,'user',{coachConversation:[{}]}, {coachConversation:[]},'2026-09-12T00:01:00Z');recordJourney(db,'user',{}, {coachConversation:[{}]},'2026-09-12T00:02:00Z');assert.equal(db.prepare('SELECT count(*) n FROM admin_program_sessions').get().n,2);
}finally{db.close();}});
test('API/save errors counted without request bodies or changing response semantics',async()=>{const db=fixture();try{
 const handler=withApiMetrics(()=>db,async()=>Response.json({error:'failed'},{status:409}),{save:true});assert.equal((await handler()).status,409);
 const metrics=adminMetrics(db);assert.equal(metrics.productHealth.apiErrorRate,1);assert.equal(metrics.productHealth.saveFailures,1);
 assert.equal((await withApiMetrics(()=>{throw Error('unavailable');},async()=>new Response('ok'))()).status,200);
}finally{db.close();}});

test('promoted admins are excluded consistently from historical journey language counts',()=>{const db=fixture();try{recordJourney(db,'user',{}, {coachConversation:[{}]},'2026-09-12T12:00:00Z');assert.equal(adminMetrics(db).engagement.languageSplit.es,1);db.prepare("UPDATE accounts SET role='admin' WHERE participant_id='user'").run();const data=adminMetrics(db);assert.equal(data.engagement.sessionsStarted,0);assert.deepEqual(data.engagement.languageSplit,{en:0,es:0});}finally{db.close();}});
