import test from 'node:test';import assert from 'node:assert/strict';
import {renderPrivateVault,supportMetadata,canonicalParticipantId,acuteDistressMetric} from '../app/lib/vault-projection.mjs';
const id='11111111-1111-4111-8111-111111111111';
const marker='SYNTHETIC_PRIVATE_TRANSCRIPT_42';
const snapshot=()=>({participant:{id,email:'synthetic@example.test',created_at:'2026-09-12T00:00:00Z',password_hash:'DO_NOT_EXPORT'},stateUpdatedAt:'2026-09-12T01:00:00Z',state:{intake:{name:'Synthetic'},proposedOffer:{name:'Offer'},coachConversation:[{role:'user',content:marker+'\n```\n# fake header'}]},shops:[],timeline:[]});
test('deterministic, private transcript preserved, no credential projection',()=>{
 const a=renderPrivateVault(snapshot()),b=renderPrivateVault(snapshot());assert.deepEqual(a,b);assert.ok(a.files['conversation.md'].includes(marker));assert.ok(a.files['conversation.md'].includes('````'));assert.ok(!JSON.stringify(a).includes('DO_NOT_EXPORT'));
});
test('reject traversal and mixed-owner snapshots',()=>{assert.throws(()=>canonicalParticipantId('../../private'));assert.throws(()=>renderPrivateVault({...snapshot(),shops:[{participant_id:'22222222-2222-4222-8222-222222222222',handle:'sample'}]}),/owner_mismatch/);});
test('support allowlist cannot expose transcript anywhere, even nested metadata injection',()=>{
 const result=supportMetadata({participantId:id,accountStatus:'active',createdAt:'2026-09-12',lastActiveAt:'2026-09-12',coachState:'done',shopCount:1,timelineCount:2,state:snapshot().state,conversation:marker,profile:marker,vault:{present:true,status:'synced',content:marker,history:marker,lastSyncedAt:'2026-09-12'}});
 assert.equal(JSON.stringify(result).includes(marker),false);assert.equal(result.progressState,'done');assert.deepEqual(Object.keys(result.vault),['present','lastSyncedAt','status']);assert.equal(acuteDistressMetric().value,null);
});
test('changed conversation yields changed source digest without invented message timestamps',()=>{
 const before=renderPrivateVault(snapshot());const after=snapshot();after.state.coachConversation.push({role:'assistant',content:'Synthetic reply'});const next=renderPrivateVault(after);assert.notEqual(before.sourceDigest,next.sourceDigest);assert.ok(next.files['conversation.md'].includes('## 2. assistant'));assert.ok(!next.files['conversation.md'].includes('received_at'));
});

test('owned shop edits change exported business content through validated allowlist',()=>{
 const source=snapshot();source.shops=[{participant_id:id,handle:'sample',updated_at:'2026-09-12T02:00:00Z',shop_json:JSON.stringify({handle:'sample',ownerRealName:'Private owner',offer:{name:'Original'},sections:[{type:'booking',data:{url:'https://example.test/book'}}],contact:{whatsapp:'15555555555'},unknownSecret:'EXCLUDE_ME'})}];
 const before=renderPrivateVault(source);const changed=JSON.parse(source.shops[0].shop_json);changed.offer.name='Updated offer';changed.sections.push({type:'testimonial',data:{quote:'Owner edited section',author:'Synthetic'}});source.shops[0].shop_json=JSON.stringify(changed);const after=renderPrivateVault(source);
 assert.notEqual(before.sourceDigest,after.sourceDigest);assert.ok(after.files['business.md'].includes('Updated offer'));assert.ok(after.files['business.md'].includes('Owner edited section'));assert.ok(after.files['business.md'].includes('15555555555'));assert.ok(!after.files['business.md'].includes('EXCLUDE_ME'));
});
