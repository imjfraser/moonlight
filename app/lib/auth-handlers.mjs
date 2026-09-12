import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "./db.js";
import { readRequestJson } from "./request-json.mjs";
import { AUTH_COOKIES, authOrigin, requireSameOrigin, authErrorResponse, getAuthenticatedAccount, setSessionCookie, clearSessionCookie } from "./auth.mjs";
import { normalizeEmail, issueMagicLink, consumeMagicLink, revokeMagicLink, revokeSession } from "./account-store.mjs";
import { participantCacheScope } from "./cache-scope.mjs";
import { emailReady, sendLoginEmail } from "./auth-email.mjs";
import { checkAuthRateLimit } from "./auth-rate-limit.mjs";
const headers={"Cache-Control":"no-store","Referrer-Policy":"no-referrer"};
const result=(body,status=200,extra={})=>NextResponse.json(body,{status,headers:{...headers,...extra}});
async function input(req) {
  requireSameOrigin(req);
  return readRequestJson(req,4096);
}
export function authHandlers(audience="user") {
  return {
    async request(req) {
      let body,email;
      try {
        body=await input(req);
        if(!body || Array.isArray(body) || Object.keys(body).some(k=>!["email","lang"].includes(k)) || (body.lang!==undefined&&!["en","es"].includes(body.lang)))return result({error:"invalid_request"},400);
        email=normalizeEmail(body.email);
      } catch(error) {
        if(error.status===403)return authErrorResponse(error);
        return result({error:error.message==="invalid_email"?"invalid_email":"invalid_request"},error.status===413?413:400);
      }
      const wait=checkAuthRateLimit(email);
      if(wait)return result({error:"rate_limited"},429,{"Retry-After":String(wait)});
      if(!emailReady())return result({error:"email_unavailable"},503);
      let token;
      try {
        token=issueMagicLink(getDb(),email,audience);
        if(token)await sendLoginEmail({email,token,audience,lang:body.lang,origin:authOrigin()});
        return result({sent:true});
      } catch {
        if(token)try{revokeMagicLink(getDb(),token);}catch{}
        return result({error:"email_unavailable"},503);
      }
    },
    async verify(req) {
      try {
        const body=await input(req);
        const wait=checkAuthRateLimit();
        if(wait)return result({error:"rate_limited"},429,{"Retry-After":String(wait)});
        if(!body||Array.isArray(body)||Object.keys(body).some(k=>k!=="token"))return result({error:"invalid_token"},400);
        const verified=consumeMagicLink(getDb(),body.token,audience);
        if(!verified)return result({error:"invalid_token"},400);
        const response=result({authenticated:true,account:verified.account,redirect:audience==="admin"?"/admin":"/architect"});
        setSessionCookie(response,verified.sessionToken,audience);
        // The legacy participant-id cookie is never accepted as authentication.
        response.cookies.set("ll_pid","",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});
        return response;
      } catch(error) {
        if(error.status===403)return authErrorResponse(error);
        return result({error:"invalid_token"},400);
      }
    },
    async me() {
      try {
        const account=await getAuthenticatedAccount(audience);
        return result(account?{authenticated:true,account,...(audience==="user"?{cacheScope:participantCacheScope(account.id)}:{})}:{authenticated:false});
      } catch { return result({error:"authentication_unavailable"},503); }
    },
    async logout(req) {
      try {
        requireSameOrigin(req);
        const store=await cookies();
        revokeSession(getDb(),store.get(AUTH_COOKIES[audience])?.value,audience);
        const response=result({ok:true});
        clearSessionCookie(response,audience);
        return response;
      } catch(error) {return authErrorResponse(error);}
    },
  };
}
