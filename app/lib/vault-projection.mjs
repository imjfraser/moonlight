import { createHash } from 'node:crypto';
import { normalizeShop } from './shop-contract.mjs';

export const VAULT_FORMAT_VERSION = 1;
export const VAULT_FILES = ['profile.md', 'business.md', 'timeline.md', 'conversation.md', 'manifest.json'];
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function canonicalParticipantId(value) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error('invalid_participant_id');
  return value.toLowerCase();
}
const object=value=>value && typeof value==='object' && !Array.isArray(value);
function take(value, keys) {
  if (!object(value)) return {};
  return Object.fromEntries(keys.filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]]));
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (object(value)) return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
  return value;
}
const json=value=>JSON.stringify(stable(value),null,2);
const hash=value=>createHash('sha256').update(value).digest('hex');
function fenced(value) {
  const content=typeof value==='string'?value:json(value);
  const longest=Math.max(2,...(content.match(/`+/g)||[]).map(run=>run.length));
  const fence='`'.repeat(longest+1);
  return `${fence}\n${content}\n${fence}\n`;
}
function date(value) {
  if (typeof value!=='string' || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}
function document(kind,id,updated,body) {
  const header={title:kind,kind,participant_id:id,updated,format_version:VAULT_FORMAT_VERSION,generated:true,source:'sqlite'};
  return '---\n'+Object.entries(header).map(([key,value])=>`${key}: ${JSON.stringify(value)}`).join('\n')+'\n---\n\n'+body;
}
// Input adapter must read all records in ONE SQLite read transaction and select
// by authenticated canonical participant id. Never pass this output to admin.
export function renderPrivateVault(snapshot) {
  const id=canonicalParticipantId(snapshot.participant.id);
  for(const row of [...(snapshot.shops||[]),...(snapshot.timeline||[])]) {
    if(row.participant_id!==id)throw new Error('snapshot_owner_mismatch');
  }
  const state=object(snapshot.state)?snapshot.state:{};
  const participant=take(snapshot.participant,['id','display_name','public_name','lang','email','created_at']);
  const profile={participant,intake:take(state.intake,['name','publicName','skills','askedFor','offerType','hoursPerWeek','channels','safetyNotes','showRealName'])};
  const business=take(state,['coachState','proposedOffer','draftedMessage','marketingPlan','shopHandle','skillGapAdvice','selectedIdea','brief','kit']);
  business.publishedShops=(snapshot.shops||[]).map(row=>({
    handle:row.handle,updated_at:row.updated_at,
    shop:normalizeShop(JSON.parse(row.shop_json),row.handle,{strict:false}),
  })).sort((a,b)=>a.handle.localeCompare(b.handle));
  const timeline=(snapshot.timeline||[]).map(row=>take(row,['id','kind','summary','data_json','created_at'])).sort((a,b)=>a.id-b.id);
  const history=state.coachConversation??[];
  if(!Array.isArray(history))throw new Error('invalid_conversation');
  const transcript=history.map((message,index)=>{
    if(!object(message)||!['user','assistant'].includes(message.role)||typeof message.content!=='string')throw new Error('invalid_conversation');
    // No invented timestamps; source currently stores ordered conversation entries.
    return `## ${index+1}. ${message.role}\n\n`+fenced(message.content);
  }).join('\n');
  const dates=[snapshot.participant.created_at,snapshot.stateUpdatedAt,...(snapshot.shops||[]).map(row=>row.updated_at),...timeline.map(row=>row.created_at)].map(date).filter(Boolean).sort();
  const updated=dates.at(-1)??null;
  const files={
    'profile.md':document('Profile',id,updated,'# Profile\n\n'+fenced(profile)),
    'business.md':document('Business',id,updated,'# Current offer and plan\n\n'+fenced(business)),
    'timeline.md':document('Timeline',id,updated,'# Stored milestones\n\n'+fenced(timeline)),
    'conversation.md':document('Conversation',id,updated,'# Saved conversation\n\n'+(transcript||'No saved conversation.\n')),
  };
  const sourceDigest=hash(json(files));
  files['manifest.json']=json({format_version:VAULT_FORMAT_VERSION,participant_id:id,source_digest:sourceDigest,updated,files:Object.fromEntries(Object.entries(files).map(([name,content])=>[name,hash(content)]))})+'\n';
  return {participantId:id,sourceDigest,files};
}

// Independent admin projection. NEVER spread a participant/state/vault object.
// Counts are supplied by aggregate SQL, not arbitrary transcript inspection.
export function supportMetadata({participantId,accountStatus,createdAt,lastActiveAt,coachState,shopCount,timelineCount,vault}) {
  const count=value=>Number.isSafeInteger(value)&&value>=0?value:null;
  const states=['greeting','skill_exploration','first_customer_id','offer_proposal','action_drafted','marketing_plan','done'];
  const statuses=['active','disabled','pending'];
  return {
    participantId:canonicalParticipantId(participantId),
    accountStatus:statuses.includes(accountStatus)?accountStatus:'unknown',
    createdAt:date(createdAt),lastActiveAt:date(lastActiveAt),
    progressState:states.includes(coachState)?coachState:null,
    shopCount:count(shopCount),timelineCount:count(timelineCount),
    vault:{present:vault?.present===true,lastSyncedAt:date(vault?.lastSyncedAt),status:['pending','synced','failed'].includes(vault?.status)?vault.status:'unknown'},
  };
}
export const acuteDistressMetric = () => ({value:null,status:'unavailable',reason:'No structured acute-distress-handled event exists in the current application.'});
