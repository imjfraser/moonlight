import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '../lib/auth.mjs';
export const dynamic='force-dynamic';
export default async function AccountPage() {
 let account;
 try {account=await requireUser();}catch{redirect('/login');}
 const es=(await cookies()).get('moonlight.lang')?.value==='es';
 const copy=es?{
  title:'Tu cuenta',heading:'Tu memoria privada',
  description:'Descarga tu perfil, oferta, plan de negocio, páginas, hitos y conversación guardados como archivos Markdown.',
  note:'La descarga incluye tu última copia sincronizada. Si aún se está preparando, vuelve a intentarlo en un momento.',
  download:'Descargar memoria privada',back:'Volver a Sol',
 }:{
  title:'Your account',heading:'Your private memory',
  description:'Download your saved profile, offer, business plan, shop pages, milestones and conversation as Markdown files.',
  note:'The download includes your latest synchronized copy. If it is still being prepared, try again shortly.',
  download:'Download private memory',back:'Return to Sol',
 };
 return <><h1>{copy.title}</h1><p>{account.email}</p>
  <section className="card"><h2>{copy.heading}</h2><p>{copy.description}</p>
   <a className="btn" href="/api/vault/export">{copy.download}</a><p>{copy.note}</p>
  </section><Link href="/architect">{copy.back}</Link></>;
}
