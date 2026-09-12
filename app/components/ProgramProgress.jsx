"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useLang } from "../lib/i18n";
import { programProgress, programSquares } from "../lib/program-progress.mjs";
import { journeyView } from "../lib/coach-journey.mjs";
import { subscribeShops, getShopStatus } from "../lib/shop-store";
const INITIAL = { status: "ready" };

export default function ProgramProgress({ session }) {
  const es = useLang() === "es";
  const handle = journeyView(session).shopHandle;
  const publication = useSyncExternalStore(subscribeShops, () => getShopStatus(handle), () => INITIAL);
  const progress = programProgress(session, publication.status);
  const name = stage => es ? stage.es : stage.en;
  const artifacts = [
    ["offer", es ? "Oferta con precio" : "Offer with a price", "#coach-offer"],
    ["message", es ? "Primer mensaje preparado" : "First message prepared", "#coach-message"],
    ["plan", es ? "Plan de 30 días" : "30-day plan", "#coach-plan"],
    ["shop", es ? "Página publicada" : "Published page", progress.artifacts.shop ? `/shop/${handle}` : "/me"],
  ];
  return <section className="card" aria-labelledby="program-heading">
    <span className="pill">{es ? "Tu miniincubadora" : "Your mini-incubator"}</span>
    <h2 id="program-heading" style={{ marginTop: 10 }}>{es ? "De una habilidad a tu primer paso" : "From a skill to your first step"}</h2>
    <ol aria-label={es ? "Progreso de las siete etapas" : "Seven-stage program progress"} style={{ display: "flex", flexWrap: "wrap", gap: 6, listStyle: "none", padding: 0, margin: "16px 0 8px" }}>
      {programSquares(progress).map((stage, index) => {
        const completed = stage.squareStatus === "completed";
        const current = stage.squareStatus === "current";
        const status = completed ? (es ? "completada" : "completed") : current ? (es ? "actual" : "current") : (es ? "por explorar" : "upcoming");
        const label = es ? `Etapa ${index + 1} de 7: ${name(stage)} — ${status}` : `Stage ${index + 1} of 7: ${name(stage)} — ${status}`;
        return <li key={stage.id} aria-current={stage.current ? "step" : undefined}>
          <span role="img" aria-label={label} title={label} style={{
            display: "inline-flex", width: 30, height: 30, alignItems: "center", justifyContent: "center",
            borderRadius: 4, border: current ? "3px solid #80510d" : completed ? "2px solid #356044" : "1px solid #8a8177",
            background: completed ? "#356044" : "#fff", color: completed ? "#fff" : "#594e40",
            fontSize: 13, fontWeight: 700, boxSizing: "border-box",
          }}><span aria-hidden="true">{completed ? "✓" : index + 1}</span></span>
        </li>;
      })}
    </ol>
    <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>{es
      ? "Relleno: etapa cubierta con Sol. Contorno grueso: etapa actual. Vacío: por explorar. La última se rellena cuando el kit y la publicación están listos."
      : "Filled: covered with Sol. Bold outline: current stage. Empty: upcoming. The last fills when the kit and publication are ready."}</p>
    <p><strong>{es ? "Ahora: " : "Now: "}</strong>{name(progress.current)}</p>
    <p className="muted"><strong>{es ? "Siguiente paso: " : "Next step: "}</strong>{progress.graduationReady
      ? (es ? "Usa tu mensaje y vuelve a contarle a Sol cómo te fue." : "Use your message, then tell Sol how it went.")
      : (es ? progress.next.nextEs : progress.next.nextEn)}</p>
    <details>
      <summary>{es ? "Ver las siete etapas" : "See the seven stages"}</summary>
      <ol className="clean">
        {progress.stages.map(stage => <li key={stage.id} aria-current={stage.status === "current" ? "step" : undefined}>
          {name(stage)} <span className="muted">— {stage.status === "current" ? (es ? "actual" : "current") : stage.status === "visited" ? (es ? "conversado" : "discussed") : (es ? "por explorar" : "to explore")}</span>
        </li>)}
      </ol>
    </details>
    <h3>{progress.graduationReady ? (es ? "Tu kit inicial está listo" : "Your starter kit is ready") : (es ? "Tus materiales de lanzamiento" : "Your launch materials")}</h3>
    <p className="muted">{es ? `${progress.readyCount} de 4 materiales preparados.` : `${progress.readyCount} of 4 materials prepared.`}</p>
    <ul className="clean">
      {artifacts.map(([key, label, href]) => <li key={key}>
        <strong>{label}</strong> — {progress.artifacts[key] ? (es ? "listo" : "ready") : key === "shop" ? (es ? "publicación sin confirmar" : "publication unconfirmed") : (es ? "por preparar" : "to prepare")}
        {progress.artifacts[key] && <> · {key === "shop" ? <Link href={href}>{es ? "Abrir" : "Open"}</Link> : <a href={href}>{es ? "Revisar" : "Review"}</a>}</>}
      </li>)}
    </ul>
    {progress.arcReviewed && !progress.graduationReady && <p>{es ? "Llegaste a la revisión del plan. Aún faltan materiales por preparar o una publicación por confirmar; puedes continuar con Sol." : "You reached the plan review. Some materials or publication confirmation are still missing; you can keep working with Sol."}</p>}
    <p className="muted" style={{ fontSize: 13 }}>{es
      ? "Este resumen muestra materiales preparados, no ventas realizadas ni mensajes enviados. Puedes volver a cualquier paso y seguir hablando con Sol."
      : "This summary shows prepared materials, not completed sales or sent messages. You can revisit any step and keep talking with Sol."}</p>
  </section>;
}
