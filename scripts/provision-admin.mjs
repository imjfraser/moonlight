// Explicit operator action; no default identity and no admin role-grant HTTP API.
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { migrate } from "../app/lib/migrations.mjs";
import { provisionAdmin } from "../app/lib/account-store.mjs";
const args=process.argv.slice(2);
const emailIndex=args.indexOf("--email");
if(emailIndex<0||!args[emailIndex+1]){
  console.error("Usage: node scripts/provision-admin.mjs --email <authorized-email> [--promote-existing]");
  process.exit(1);
}
if(args.some((arg,i)=>i!==emailIndex&&i!==emailIndex+1&&arg!=="--promote-existing"))throw new Error("Unexpected arguments");
const dir=process.env.MOONLIGHT_DATA_DIR||path.join(process.cwd(),"data");
mkdirSync(dir,{recursive:true,mode:0o700});
const db=new Database(path.join(dir,"moonlight.sqlite"));
try{
  db.pragma("foreign_keys=ON");migrate(db);
  provisionAdmin(db,args[emailIndex+1],Date.now(),{promoteExisting:args.includes("--promote-existing")});
  console.log("Administrator provisioned. Sign in through /admin/login using email verification.");
}finally{db.close();}
