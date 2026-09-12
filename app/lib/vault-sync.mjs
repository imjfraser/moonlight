import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { canonicalParticipantId, renderPrivateVault, VAULT_FILES } from './vault-projection.mjs';
const execute=promisify(execFile);
// Call from the version-3 migration transaction AFTER accounts exists.
export function installVaultSchema(db) {
 db.exec(`CREATE TABLE IF NOT EXISTS participant_vault_sync (
  participant_id TEXT PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  requested_generation INTEGER NOT NULL DEFAULT 1,
  completed_generation INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT, last_error_code TEXT,
  attempts INTEGER NOT NULL DEFAULT 0, next_retry_at INTEGER NOT NULL DEFAULT 0
 );`);
}
export function verifyVaultSchema(db) {
 const expected=['participant_id','requested_generation','completed_generation','lease_token','lease_until','synced_at','last_error_code','attempts','next_retry_at'];
 const actual=db.prepare('PRAGMA table_info(participant_vault_sync)').all();
 if(expected.some(name=>!actual.some(column=>column.name===name)) || !actual.some(column=>column.name==='participant_id'&&column.pk===1))throw new Error('invalid_vault_schema');
}
// Invoke INSIDE the same transaction as account/profile, journey, or shop changes.
// Non-user accounts (including admin-only identities) never get private vaults.
export function markVaultDirty(db, participantId) {
 db.prepare(`INSERT INTO participant_vault_sync(participant_id)
 SELECT participant_id FROM accounts WHERE participant_id=? AND role='user'
 ON CONFLICT(participant_id) DO UPDATE SET
 requested_generation=participant_vault_sync.requested_generation+1,next_retry_at=0`).run(participantId);
}
function snapshot(db,id) {
 const participant=db.prepare(`SELECT p.id,p.display_name,p.public_name,p.lang,a.email,p.created_at
 FROM participants p JOIN accounts a ON a.participant_id=p.id
 WHERE p.id=? AND a.role='user'`).get(id);
 if(!participant)throw new Error('ineligible_participant');
 const state=db.prepare('SELECT state_json,updated_at FROM participant_state WHERE participant_id=?').get(id);
 return {participant,state:state?JSON.parse(state.state_json):{},stateUpdatedAt:state?.updated_at,
 shops:db.prepare('SELECT participant_id,handle,shop_json,updated_at FROM shops WHERE participant_id=? ORDER BY handle').all(id),
 timeline:db.prepare('SELECT participant_id,id,kind,summary,data_json,created_at FROM timeline WHERE participant_id=? ORDER BY id').all(id)};
}
async function directory(dir) {
 await fs.mkdir(dir,{recursive:true,mode:0o700});
 const stat=await fs.lstat(dir);
 if(!stat.isDirectory()||stat.isSymbolicLink()||await fs.realpath(dir)!==path.resolve(dir))throw new Error('unsafe_vault_path');
 await fs.chmod(dir,0o700);
}
async function git(dir,args) {
 return (await execute('git',['-c','core.hooksPath=/dev/null','-c','user.name=Moonlight Vault','-c','user.email=vault@localhost',...args],{
 cwd:dir,timeout:15000,maxBuffer:1024*1024,
 env:{PATH:process.env.PATH||'/usr/bin:/bin',LANG:'C',LC_ALL:'C',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'},
 })).stdout.trim();
}
async function writeProjection(root,projection) {
 const base=path.resolve(root);await directory(base);
 const dir=path.join(base,canonicalParticipantId(projection.participantId));await directory(dir);
 try { const stat=await fs.lstat(path.join(dir,'.git'));if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('unsafe_vault_path'); }
 catch(error){if(error.code!=='ENOENT')throw error;await git(dir,['init','--quiet']);}
 for(const name of VAULT_FILES) {
  const target=path.join(dir,name);
  try{if((await fs.lstat(target)).isSymbolicLink())throw new Error('unsafe_vault_path');}catch(error){if(error.code!=='ENOENT')throw error;}
  const temporary=path.join(dir,`.sync-${randomUUID()}`);
  try{await fs.writeFile(temporary,projection.files[name],{flag:'wx',mode:0o600});await fs.rename(temporary,target);}finally{await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
 }
 // Never commit an unexpected staged file or use arbitrary participant paths.
 const staged=await git(dir,['diff','--cached','--name-only']);
 if(staged.split('\n').filter(Boolean).some(name=>!VAULT_FILES.includes(name)))throw new Error('unexpected_staged_file');
 await git(dir,['add','--',...VAULT_FILES]);
 if(await git(dir,['diff','--cached','--name-only']))await git(dir,['commit','--quiet','-m','Sync participant memory']);
 return git(dir,['rev-parse','HEAD']);
}
// Filesystem/Git work never holds a SQLite transaction. Lease prevents two worker
// processes touching one repo concurrently; Git commands have bounded timeouts.
export async function syncVaultParticipant(db,root,participantId,{now=()=>Date.now()}={}) {
 const id=canonicalParticipantId(participantId),token=randomUUID(),time=now();
 const claim=db.transaction(()=>{
  const row=db.prepare('SELECT * FROM participant_vault_sync WHERE participant_id=?').get(id);
  if(!row||row.requested_generation<=row.completed_generation||row.lease_until>time||row.next_retry_at>time)return null;
  db.prepare('UPDATE participant_vault_sync SET lease_token=?,lease_until=? WHERE participant_id=?').run(token,time+180000,id);
  try { return {generation:row.requested_generation,snapshot:snapshot(db,id)}; }
  catch { return {generation:row.requested_generation,snapshotError:true}; }
 }).immediate();
 if(!claim)return {status:'idle'};
 try {
  if(claim.snapshotError)throw new Error('invalid_snapshot');
  const projection=renderPrivateVault(claim.snapshot);
  const commit=await writeProjection(root,projection);
  db.prepare(`UPDATE participant_vault_sync SET completed_generation=?,lease_token=NULL,lease_until=0,
   synced_at=?,last_error_code=NULL,attempts=0,next_retry_at=0 WHERE participant_id=? AND lease_token=?`)
   .run(claim.generation,new Date(now()).toISOString(),id,token);
  return {status:'synced',commit,sourceDigest:projection.sourceDigest};
 }catch{
  // Never log raw exception strings: paths/output may contain private material.
  db.prepare(`UPDATE participant_vault_sync SET lease_token=NULL,lease_until=0,last_error_code='sync_failed',
   attempts=attempts+1,next_retry_at=? WHERE participant_id=? AND lease_token=?`).run(now()+60000,id,token);
  return {status:'failed',error:'sync_failed'};
 }
}
export async function syncPendingVaults(db,root,{limit=10}={}) {
 if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('invalid_batch_limit');
 const rows=db.prepare(`SELECT participant_id FROM participant_vault_sync WHERE requested_generation>completed_generation
 AND lease_until<=? AND next_retry_at<=? ORDER BY next_retry_at,participant_id LIMIT ?`).all(Date.now(),Date.now(),limit);
 const counts={synced:0,failed:0,idle:0};
 for(const row of rows){const result=await syncVaultParticipant(db,root,row.participant_id);counts[result.status]++;}
 return counts;
}

// Start once from Node server instrumentation AFTER database migrations. The
// durable queue survives process restarts; no separate service/cron is required.
export function startVaultWorker(db,root,{intervalMs=30000}={}) {
 const key=Symbol.for('moonlight.private-vault-worker.v1');
 if(globalThis[key])return globalThis[key];
 let running=false;
 const tick=async()=>{if(running)return;running=true;try{await syncPendingVaults(db,root);}catch{/* Metadata health reports queue lag; never log private exception text. */}finally{running=false;}};
 const timer=setInterval(tick,intervalMs);timer.unref?.();
 const worker={stop(){clearInterval(timer);delete globalThis[key];}};
 globalThis[key]=worker;void tick();return worker;
}

// Participant-only current snapshot export. The HTTP adapter MUST obtain id from
// requireUser(), never a URL/query body, and must never expose this to admins.
export async function exportPrivateVault(db,root,participantId) {
 const id=canonicalParticipantId(participantId);
 const account=db.prepare("SELECT participant_id FROM accounts WHERE participant_id=? AND role='user' AND status='active'").get(id);
 if(!account)throw new Error('vault_export_forbidden');
 const status=await syncVaultParticipant(db,root,id);
 const queue=db.prepare('SELECT requested_generation,completed_generation FROM participant_vault_sync WHERE participant_id=?').get(id);
 if(status.status==='failed'||!queue||queue.requested_generation!==queue.completed_generation)throw new Error('vault_not_ready');
 const dir=path.join(path.resolve(root),id);
 if(await fs.realpath(dir)!==dir||(await fs.lstat(dir)).isSymbolicLink())throw new Error('unsafe_vault_path');
 // Archive only committed allowlisted files: no mixed working-tree snapshot,
 // .git credentials/config/history, symlinks, or unrelated files.
 const result=await execute('git',['-c','core.hooksPath=/dev/null','archive','--format=zip','HEAD','--',...VAULT_FILES],{
  cwd:dir,encoding:'buffer',timeout:15000,maxBuffer:32*1024*1024,
  env:{PATH:process.env.PATH||'/usr/bin:/bin',LANG:'C',LC_ALL:'C',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'},
 });
 return result.stdout;
}
