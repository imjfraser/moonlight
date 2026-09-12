import { randomUUID } from 'node:crypto';
export function migrateAdmin(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS admin_activity (participant_id TEXT NOT NULL, day TEXT NOT NULL, lang TEXT NOT NULL, PRIMARY KEY(participant_id,day));
    CREATE TABLE IF NOT EXISTS admin_program_sessions (id TEXT PRIMARY KEY, participant_id TEXT NOT NULL, started_at TEXT NOT NULL, last_at TEXT NOT NULL, ended_at TEXT, completed_at TEXT, lang TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS admin_sessions_owner ON admin_program_sessions(participant_id,started_at);
    CREATE TABLE IF NOT EXISTS admin_milestones (participant_id TEXT NOT NULL, kind TEXT NOT NULL, at TEXT NOT NULL, PRIMARY KEY(participant_id,kind));
    CREATE TABLE IF NOT EXISTS admin_counters (day TEXT NOT NULL, kind TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,kind));`);
}
const counterKinds = new Set(['api_attempts','api_errors','save_attempts','save_failures','build_attempts','build_failures']);
export function incrementCounter(db, kind, now = new Date().toISOString()) {
  if (!counterKinds.has(kind)) throw new Error('invalid_counter');
  db.prepare(`INSERT INTO admin_counters(day,kind,value) VALUES(?,?,1) ON CONFLICT(day,kind) DO UPDATE SET value=value+1`).run(now.slice(0,10),kind);
}
// Scalar events only. No user text is copied into telemetry.
export function recordActivity(db,id,lang,now = new Date().toISOString()) {
  if(!db.prepare("SELECT 1 FROM accounts WHERE participant_id=? AND role='user'").get(id)) return;
  lang = lang === 'es' ? 'es' : 'en';
  db.prepare('UPDATE participants SET lang=? WHERE id=?').run(lang,id);
  db.prepare('INSERT INTO admin_activity(participant_id,day,lang) VALUES(?,?,?) ON CONFLICT(participant_id,day) DO UPDATE SET lang=excluded.lang').run(id,now.slice(0,10),lang);
}
export function recordJourney(db,id,before,after,now = new Date().toISOString()) {
  if (!db.prepare("SELECT 1 FROM accounts WHERE participant_id=? AND role='user'").get(id)) return;
  const previous = Array.isArray(before?.coachConversation) ? before.coachConversation : [];
  const history = Array.isArray(after?.coachConversation) ? after.coachConversation : [];
  const lang = db.prepare('SELECT lang FROM participants WHERE id=?').get(id)?.lang === 'es' ? 'es' : 'en';
  db.prepare('INSERT INTO admin_activity(participant_id,day,lang) VALUES(?,?,?) ON CONFLICT(participant_id,day) DO UPDATE SET lang=excluded.lang').run(id,now.slice(0,10),lang);
  let session = db.prepare('SELECT id,completed_at FROM admin_program_sessions WHERE participant_id=? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1').get(id);
  if (previous.length && !history.length && session) {
    db.prepare('UPDATE admin_program_sessions SET ended_at=?,last_at=? WHERE id=?').run(now,now,session.id); session=null;
  }
  if (history.length) {
    if (!session) {
      session={id:randomUUID()};
      db.prepare('INSERT INTO admin_program_sessions(id,participant_id,started_at,last_at,lang) VALUES(?,?,?,?,?)').run(session.id,id,now,now,lang);
    } else db.prepare('UPDATE admin_program_sessions SET last_at=?,lang=? WHERE id=?').run(now,lang,session.id);
    if (after.coachState === 'done' && !session.completed_at) db.prepare('UPDATE admin_program_sessions SET completed_at=? WHERE id=? AND completed_at IS NULL').run(now,session.id);
  }
  if (typeof after?.draftedMessage === 'string' && after.draftedMessage.trim()) db.prepare("INSERT OR IGNORE INTO admin_milestones(participant_id,kind,at) VALUES(?,'message_drafted',?)").run(id,now);
}
export function withApiMetrics(getDb, handler, {save = false} = {}) {
  return async (...args) => {
    const count = kind => { try { incrementCounter(getDb(),kind); } catch {} }; // Telemetry cannot turn a successful save into a failure.
    count('api_attempts'); if(save) count('save_attempts');
    try {
      const response=await handler(...args);
      if(response.status>=400) { count('api_errors'); if(save) count('save_failures'); }
      return response;
    } catch(error) { count('api_errors'); if(save) count('save_failures'); throw error; }
  };
}
export function adminMetrics(db, now = new Date()) {
  const scalar=(sql,...args)=>db.prepare(sql).get(...args)?.n ?? 0;
  const day=now.toISOString().slice(0,10);
  const since=n=>new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())-(n-1)*86400000).toISOString().slice(0,10);
  const active=n=>scalar("SELECT count(DISTINCT x.participant_id) n FROM admin_activity x JOIN accounts a ON a.participant_id=x.participant_id WHERE a.role='user' AND day BETWEEN ? AND ?",since(n),day);
  const started=scalar("SELECT count(*) n FROM admin_program_sessions s JOIN accounts a ON a.participant_id=s.participant_id WHERE a.role='user'");
  const completed=scalar("SELECT count(*) n FROM admin_program_sessions s JOIN accounts a ON a.participant_id=s.participant_id WHERE a.role='user' AND completed_at IS NOT NULL");
  const counters=Object.fromEntries(db.prepare('SELECT kind,sum(value) n FROM admin_counters GROUP BY kind').all().map(r=>[r.kind,r.n]));
  const rate=(errors,total)=>total ? errors/total : null;
  const shops=scalar("SELECT count(*) n FROM shops s JOIN accounts a ON a.participant_id=s.participant_id WHERE a.role='user'");
  return {
    growth:{signups:scalar("SELECT count(*) n FROM accounts WHERE role='user'"),DAU:active(1),WAU:active(7),MAU:active(30)},
    engagement:{sessionsStarted:started,sessionsCompleted:completed,arcCompletionRate:rate(completed,started),averageSessionLengthSeconds:completed ? scalar("SELECT avg(max(0,(julianday(completed_at)-julianday(started_at))*86400)) n FROM admin_program_sessions s JOIN accounts a ON a.participant_id=s.participant_id WHERE a.role='user' AND completed_at IS NOT NULL") : null,languageSplit:{en:scalar("SELECT count(*) n FROM admin_program_sessions s JOIN accounts a ON a.participant_id=s.participant_id WHERE a.role='user' AND s.lang='en'"),es:scalar("SELECT count(*) n FROM admin_program_sessions s JOIN accounts a ON a.participant_id=s.participant_id WHERE a.role='user' AND s.lang='es'")}},
    businessOutcomes:{shopsCreated:shops,shopsPublished:shops,firstCustomerMessageDrafted:scalar("SELECT count(*) n FROM admin_milestones m JOIN accounts a ON a.participant_id=m.participant_id WHERE a.role='user' AND kind='message_drafted'")},
    productHealth:{saveFailures:counters.save_failures||0,buildErrorRate:rate(counters.build_failures||0,counters.build_attempts||0),apiErrorRate:rate(counters.api_errors||0,counters.api_attempts||0)},
    monetization:{conversionRate:null,MRR:null,churn:null},
    safety:{acuteDistressDisclosuresHandled:null},
  };
}
export function supportAccount(db,id) {
  // Do not expand this into a raw state/vault/history browser.
  return db.prepare("SELECT participant_id AS id,email,status,enrollment_tier AS enrollmentTier,created_at AS createdAt,email_verified_at AS verifiedAt FROM accounts WHERE participant_id=? AND role='user'").get(id) || null;
}
