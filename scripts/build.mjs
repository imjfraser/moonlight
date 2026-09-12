import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {existsSync} from 'node:fs';
const require=createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
function count(kind){
  // A build does not migrate the application schema or create a participant DB.
  const file=path.join(process.env.MOONLIGHT_DATA_DIR||path.join(process.cwd(),'data'),'moonlight.sqlite');
  if(!existsSync(file))return;
  let db;
  try{
    const Database=require('better-sqlite3');db=new Database(file);
    db.pragma('busy_timeout=3000');
    db.exec('CREATE TABLE IF NOT EXISTS admin_counters(day TEXT NOT NULL,kind TEXT NOT NULL,value INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,kind))');
    db.prepare('INSERT INTO admin_counters(day,kind,value) VALUES(?,?,1) ON CONFLICT(day,kind) DO UPDATE SET value=value+1').run(new Date().toISOString().slice(0,10),kind);
  }catch{process.stderr.write('Build telemetry unavailable; build result remains authoritative.\n');}finally{db?.close();}
}
count('build_attempts');
const result=spawnSync(process.execPath,[require.resolve('next/dist/bin/next'),'build'],{stdio:'inherit',env:process.env});
if(result.status!==0)count('build_failures');
process.exit(result.status??1);
