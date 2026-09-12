import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "../../../lib/auth.mjs";
import { getDb } from "../../../lib/db";
import { supportAccount } from "../../../lib/admin-metrics.mjs";
export const dynamic = "force-dynamic";
const FIELDS = {
  id: ["Account ID","ID de la cuenta"], email: ["Email address","Correo electrónico"],
  status: ["Account status","Estado de la cuenta"], enrollmentTier: ["Enrollment tier","Nivel de inscripción"],
  createdAt: ["Created","Fecha de creación"], verifiedAt: ["Email verified","Correo verificado"],
};
export default async function AccountSupport({ params, searchParams }) {
  try { await requireAdmin(); } catch { redirect("/admin/login"); }
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) notFound();
  const query = await searchParams;
  const chosen = query?.lang === "en" || query?.lang === "es" ? query.lang : (await cookies()).get("moonlight.lang")?.value;
  const es = chosen === "es", lang = es ? "es" : "en";
  const db = getDb(), account = supportAccount(db,id);
  if (!account) notFound();
  const vault = db.prepare("SELECT 1 AS present FROM participant_vault_sync WHERE participant_id=?").get(id);
  // Operational presence only: no vault files, narratives or Git data are read.
  function value(key, input) {
    if (input === null || input === undefined) return es ? "No disponible" : "Not available";
    if (key === "status") return input === "active" ? (es ? "Activa" : "Active") : (es ? "Deshabilitada" : "Disabled");
    return String(input);
  }
  return <main lang={lang}>
    <Link href={`/admin?lang=${lang}`}>{es ? "Volver a administración" : "Back to administration"}</Link>
    <h1>{es ? "Soporte de la cuenta" : "Account support"}</h1>
    <p><Link href={`/admin/users/${id}?lang=en`}>English</Link>{" · "}<Link href={`/admin/users/${id}?lang=es`}>Español</Link></p>
    <dl>{Object.entries(account).map(([key,input]) => <div key={key} style={{ padding: "6px 0", overflowWrap: "anywhere" }}>
      <dt>{FIELDS[key]?.[es ? 1 : 0] || key}</dt><dd>{value(key,input)}</dd>
    </div>)}</dl>
    <section className="card">
      <h2>{es ? "Estado del archivo privado" : "Vault status"}</h2>
      <p>{vault ? (es ? "La sincronización del archivo está registrada." : "Vault synchronization is registered.") : (es ? "Aún no hay un registro de sincronización." : "No vault synchronization record yet.")}</p>
      <p>{es ? "El contenido del archivo privado, las conversaciones, el historial de Git y las exportaciones de contenido no están disponibles para administradores." : "Private vault contents, conversation logs, Git history and content exports are not available to administrators."}</p>
    </section>
    <form action={`/api/admin/users/${id}`} method="POST">
      <input type="hidden" name="status" value={account.status === "active" ? "disabled" : "active"} />
      <button className="btn">{account.status === "active" ? (es ? "Deshabilitar cuenta y revocar sesiones" : "Disable account and revoke sessions") : (es ? "Habilitar cuenta" : "Enable account")}</button>
    </form>
  </main>;
}
