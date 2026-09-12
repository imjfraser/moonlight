"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { subscribeShops, getShopStatus } from "../lib/shop-store";
const INITIAL = { status: "ready", error: null };
export default function CoachPublication({ handle, lang, onRetry }) {
  const state = useSyncExternalStore(subscribeShops, () => getShopStatus(handle), () => INITIAL);
  const es = lang === "es";
  return <section className="card sage" aria-label={es ? "Tu página" : "Your page"}>
    <h3>{es ? "Tu página para compartir" : "Your shareable page"}</h3>
    <p role={state.status === "failed" ? "alert" : "status"}>{state.status === "published"
      ? (es ? "Tu página está publicada." : "Your page is published.")
      : state.status === "saving" ? (es ? "Publicando tu página…" : "Publishing your page…")
      : state.error === "handle_taken" ? (es ? "Este enlace pertenece a otra cuenta. Tu página no se ha publicado." : "This link belongs to another account. Your page has not been published.")
      : (es ? "La publicación aún no se ha confirmado." : "Publication has not been confirmed yet.")}</p>
    <div className="row">
      {state.status === "published" && <Link href={`/shop/${handle}`} className="btn">{es ? "Abrir mi página" : "Open my page"}</Link>}
      {state.status !== "published" && state.status !== "saving" && <button type="button" className="btn" onClick={onRetry}>{es ? "Reintentar publicación" : "Retry publication"}</button>}
      <Link href="/me" className="btn ghost">{es ? "Revisar y editar mi página" : "Review and edit my page"}</Link>
    </div>
  </section>;
}
