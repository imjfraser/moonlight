import {requireAdmin,requireSameOrigin,authErrorResponse} from '../../../../lib/auth.mjs';
import {setAccountStatus} from '../../../../lib/account-store.mjs';
import {getDb} from '../../../../lib/db';
export const runtime='nodejs';
export async function POST(req,{params}) {
  try {
    await requireAdmin(); requireSameOrigin(req);
    const {id}=await params;
    if(!/^[a-f0-9-]{36}$/i.test(id)) return Response.json({error:'invalid_account'},{status:400});
    const reader=req.body?.getReader(); if(!reader) return Response.json({error:'invalid_request'},{status:400});
    let text=''; try { while(true) {const {value,done}=await reader.read();if(done) break;text+=new TextDecoder().decode(value);if(text.length>512){await reader.cancel();return Response.json({error:'too_large'},{status:413});}} } finally {reader.releaseLock();}
    const status=new URLSearchParams(text).get('status');
    if(!['active','disabled'].includes(status)) return Response.json({error:'invalid_status'},{status:400});
    const result=setAccountStatus(getDb(),id,status);
    if(!result) return Response.json({error:'not_found'},{status:404});
    return new Response(null,{status:303,headers:{Location:`/admin/users/${id}`,'Cache-Control':'no-store'}});
  } catch(error) {return authErrorResponse(error);}
}
