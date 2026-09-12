import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { migrateAccounts } from "../app/lib/account-migrations.mjs";
import { issueMagicLink, consumeMagicLink, findSessionAccount, provisionAdmin, setAccountStatus, tokenHash, MAGIC_LINK_TTL_MS } from "../app/lib/account-store.mjs";
const Database=createRequire(import.meta.url)("better-sqlite3");
function fixture(t){
 const db=new Database(":memory:");db.pragma("foreign_keys=ON");
 db.exec("CREATE TABLE participants(id TEXT PRIMARY KEY,email TEXT,display_name TEXT)");
 migrateAccounts(db);t.after(()=>db.close());return db;
}
test("independent: wrong audience cannot consume a valid link; tokens are stored hashed",t=>{
 const db=fixture(t),now=1000000,token=issueMagicLink(db,"person@example.com","user",now);
 assert.equal(consumeMagicLink(db,token,"admin",now+1),null);
 const authenticated=consumeMagicLink(db,token,"user",now+2);assert.ok(authenticated);
 assert.equal(consumeMagicLink(db,token,"user",now+3),null);
 assert.equal(findSessionAccount(db,authenticated.sessionToken,"admin",now+3),null);
 const link=db.prepare("SELECT * FROM auth_magic_links").get(),session=db.prepare("SELECT * FROM auth_sessions").get();
 assert.equal(link.token_hash,tokenHash(token));assert.equal(session.token_hash,tokenHash(authenticated.sessionToken));
 assert.ok(!JSON.stringify(link).includes(token));assert.ok(!JSON.stringify(session).includes(authenticated.sessionToken));
});
test("independent: disabling and re-enabling never resurrects old sessions or pending links",t=>{
 const db=fixture(t),now=2000000,token=issueMagicLink(db,"person@example.com","user",now);
 const auth=consumeMagicLink(db,token,"user",now+1),pending=issueMagicLink(db,"person@example.com","user",now+2);
 setAccountStatus(db,auth.account.id,"disabled",now+3);
 assert.equal(findSessionAccount(db,auth.sessionToken,"user",now+4),null);
 assert.equal(issueMagicLink(db,"person@example.com","user",now+4),null);
 setAccountStatus(db,auth.account.id,"active",now+5);
 assert.equal(findSessionAccount(db,auth.sessionToken,"user",now+6),null);
 assert.equal(consumeMagicLink(db,pending,"user",now+6),null);
 const fresh=issueMagicLink(db,"PERSON@example.com","user",now+7);
 assert.equal(consumeMagicLink(db,fresh,"user",now+8).account.id,auth.account.id);
});
test("independent: public requests cannot create admin or silently promote participant",t=>{
 const db=fixture(t),now=3000000;
 assert.equal(issueMagicLink(db,"unknown@example.com","admin",now),null);
 assert.equal(db.prepare("SELECT count(*) n FROM accounts").get().n,0);
 const auth=consumeMagicLink(db,issueMagicLink(db,"user@example.com","user",now),"user",now+1);
 assert.throws(()=>provisionAdmin(db,"user@example.com",now+2),/cannot_be_promoted/);
 assert.equal(findSessionAccount(db,auth.sessionToken,"user",now+3).role,"user");
 const admin=provisionAdmin(db,"admin@example.com",now);
 assert.equal(issueMagicLink(db,"admin@example.com","user",now+1),null);
 const token=issueMagicLink(db,"admin@example.com","admin",now+1);
 assert.equal(consumeMagicLink(db,token,"admin",now+2).account.id,admin.id);
});
test("independent: newest link supersedes older one and exact expiry fails closed",t=>{
 const db=fixture(t),now=4000000;
 const older=issueMagicLink(db,"user@example.com","user",now),newer=issueMagicLink(db,"user@example.com","user",now+1);
 assert.equal(consumeMagicLink(db,older,"user",now+2),null);
 assert.equal(consumeMagicLink(db,newer,"user",now+1+MAGIC_LINK_TTL_MS),null);
});
