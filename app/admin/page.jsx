import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "../lib/auth.mjs";
import { getDb } from "../lib/db";
import { adminMetrics } from "../lib/admin-metrics.mjs";
export const dynamic = "force-dynamic";
const GROUPS = {
  growth: ["Growth", "Crecimiento"], engagement: ["Engagement", "Participación"],
  businessOutcomes: ["Business outcomes", "Resultados del negocio"], productHealth: ["Product health", "Estado del producto"],
  monetization: ["Monetization", "Monetización"], safety: ["Safety", "Seguridad"],
};
const LABELS = {
  signups: ["Registered accounts", "Cuentas registradas"],
  DAU: ["Daily active users (DAU)", "Usuarios activos diarios (DAU)"],
  WAU: ["Weekly active users (WAU)", "Usuarios activos semanales (WAU)"],
  MAU: ["Monthly active users (MAU)", "Usuarios activos mensuales (MAU)"],
  sessionsStarted: ["Journeys started", "Recorridos iniciados"],
  sessionsCompleted: ["Journeys completed", "Recorridos completados"],
  arcCompletionRate: ["Coaching arc completion rate", "Tasa de finalización del recorrido"],
  averageSessionLengthSeconds: ["Average completed journey duration", "Duración media de los recorridos completados"],
  languageSplit: ["Journey language", "Idioma de los recorridos"],
  shopsCreated: ["Shops created", "Páginas de negocio creadas"],
  shopsPublished: ["Shops published", "Páginas de negocio publicadas"],
  firstCustomerMessageDrafted: ["Participants with a first-customer message prepared", "Participantes con un primer mensaje preparado para un cliente"],
  saveFailures: ["Failed save attempts", "Intentos de guardado fallidos"],
  buildErrorRate: ["Build error rate", "Tasa de errores de compilación"],
  apiErrorRate: ["API error rate", "Tasa de errores de API"],
  conversionRate: ["Paid conversion rate", "Tasa de conversión a pago"],
  MRR: ["Monthly recurring revenue (MRR)", "Ingresos recurrentes mensuales (MRR)"],
  churn: ["Churn rate", "Tasa de bajas"],
  acuteDistressDisclosuresHandled: ["Acute-distress disclosures handled — count only", "Revelaciones de angustia aguda atendidas — solo recuento"],
};
const RATES = new Set(["arcCompletionRate","buildErrorRate","apiErrorRate","conversionRate","churn"]);
export default async function AdminPage({ searchParams }) {
  try { await requireAdmin(); } catch { redirect("/admin/login"); }
  const params = await searchParams;
  const query = String(params?.q || "").trim().slice(0,100);
  const chosen = params?.lang === "en" || params?.lang === "es" ? params.lang : (await cookies()).get("moonlight.lang")?.value;
  const es = chosen === "es", lang = es ? "es" : "en", locale = es ? "es-CO" : "en-US";
  const label = pair => pair[es ? 1 : 0];
  const db = getDb(), metrics = adminMetrics(db);
  const users = db.prepare("SELECT participant_id AS id,email,status,created_at AS createdAt FROM accounts WHERE role='user' AND instr(lower(email),lower(?))>0 ORDER BY created_at DESC LIMIT 50").all(query);
  function format(key, value, group) {
    if (value === null) return group === "monetization" ? (es ? "No implementado" : "Not implemented") : (es ? "No disponible" : "Not available");
    if (key === "languageSplit") return Object.entries(value).map(([language, count]) =>
      `${language === "es" ? (es ? "Español" : "Spanish") : (es ? "Inglés" : "English")}: ${new Intl.NumberFormat(locale).format(count)}`).join(" / ");
    if (typeof value === "number") {
      if (RATES.has(key)) return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(value);
      if (key === "averageSessionLengthSeconds") return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${es ? "segundos" : "seconds"}`;
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
    }
    return String(value);
  }
  return <main lang={lang}>
    <h1>{es ? "Administración" : "Administration"}</h1>
    <p>{es ? "Solo métricas agregadas. Aquí no se puede acceder al contenido de conversaciones ni mensajes." : "Aggregate metrics only. No conversation or message content is available here."}</p>
    <p aria-label={es ? "Idioma del panel" : "Dashboard language"}>
      <Link href={`/admin?${new URLSearchParams({q:query,lang:"en"})}`}>English</Link>{" · "}
      <Link href={`/admin?${new URLSearchParams({q:query,lang:"es"})}`}>Español</Link>
    </p>
    {Object.entries(metrics).map(([group, values]) => <section className="card" key={group}>
      <h2>{label(GROUPS[group] || [group,group])}</h2>
      <dl>{Object.entries(values).map(([key,value]) => <div key={key} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "4px 20px", padding: "8px 0" }}>
        <dt>{label(LABELS[key] || [key,key])}</dt><dd style={{ margin: 0, fontWeight: 600 }}>{format(key,value,group)}</dd>
      </div>)}</dl>
    </section>)}
    <p className="muted">{es
      ? "La actividad usa días UTC y guardados correctos del recorrido o solicitudes autenticadas al coach. Los demás totales se cuentan desde que comenzó la instrumentación. La duración es el tiempo transcurrido, en segundos, desde el primer turno guardado hasta el primer estado final guardado; la tasa de finalización usa los recorridos iniciados. El idioma se cuenta por recorrido. Las tasas de error incluyen respuestas HTTP 4xx/5xx de los endpoints de estado, páginas, coach y constructor. Crear y publicar una página ocurre en la misma escritura atómica, por lo que ambos recuentos coinciden actualmente. La monetización no está implementada. El recuento de seguridad no está disponible: no existe una señal estructurada de revelaciones atendidas; no se usan avisos ni transcripciones como sustitutos."
      : "Activity uses UTC days and successful journey writes/authenticated coach requests. Other totals are since instrumentation began. Session length is elapsed seconds from first saved coaching turn to the first saved done state; completion rate uses started journeys. Language split counts journeys. Error rates include HTTP 4xx/5xx responses on state, shop, coach and builder endpoints. Shops are created and published by the same atomic write, so those counts currently coincide. Monetization is not implemented. Safety count is unavailable: there is no structured handled-disclosure signal; notices and transcripts are not used as proxies."}</p>
    <section className="card">
      <h2>{es ? "Gestión de usuarios" : "User management"}</h2>
      <form>
        <input type="hidden" name="lang" value={lang} />
        <label htmlFor="user-search">{es ? "Buscar por correo" : "Search email"}</label>
        <input id="user-search" name="q" defaultValue={query} maxLength={100} />
        <button className="btn" style={{ marginTop: 10 }}>{es ? "Buscar" : "Search"}</button>
      </form>
      <ul>{users.map(user => <li key={user.id}><Link href={`/admin/users/${user.id}?lang=${lang}`}>{user.email}</Link> — {user.status === "active" ? (es ? "Activa" : "Active") : (es ? "Deshabilitada" : "Disabled")}</li>)}</ul>
      {!users.length && <p>{es ? "No hay cuentas que coincidan." : "No matching accounts."}</p>}
      <p>{es ? "Se muestran hasta 50 cuentas coincidentes." : "At most 50 matching accounts are shown."}</p>
    </section>
  </main>;
}
