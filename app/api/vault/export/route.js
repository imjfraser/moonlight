import { requireUser, authErrorResponse, AuthError } from '../../../lib/auth.mjs';
import { getDb, getVaultRoot } from '../../../lib/db';
import { exportPrivateVault } from '../../../lib/vault-sync.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET() {
 try {
  const account=await requireUser();
  const archive=await exportPrivateVault(getDb(),getVaultRoot(),account.id);
  // A revoked/disabled/switched session must not receive completed private bytes.
  const current=await requireUser();
  if(current.id!==account.id)throw new AuthError('account_changed',409);
  return new Response(archive,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="moonlight-vault.zip"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){
  if(error instanceof AuthError)return authErrorResponse(error);
  return Response.json({error:'vault_export_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
