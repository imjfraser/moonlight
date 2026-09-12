"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { hydrateSession, subscribeSession, getSessionStatus, retrySession, discardDraftAndReload, downloadSessionDraft } from "../lib/session";
import { useLang } from "../lib/i18n";
import { hydrateShops } from "../lib/shop-store";
let shopsHydration;
const INITIAL = { status: "loading", ready: false, error: null };
const JOURNEY = ["/start", "/architect", "/brief", "/kit", "/preview", "/me"];
export default function Boot({ children }) {
  const path = usePathname();
  const active = JOURNEY.includes(path);
  const state = useSyncExternalStore(subscribeSession, getSessionStatus, () => INITIAL);
  const [shopsReady, setShopsReady] = useState(false);
  const es = useLang() === "es";
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void (async () => {
      await hydrateSession();
      shopsHydration ||= hydrateShops();
      await shopsHydration;
      if (!cancelled) setShopsReady(true);
    })();
    return () => { cancelled = true; };
  }, [active]);
  if (!active) return children;
  const labels = es
    ? { loading: "Cargando…", ready: "Listo", saving: "Guardando…", saved: "Guardado", failed: "No se pudo sincronizar. Tu borrador no se ha descartado." }
    : { loading: "Loading…", ready: "Ready", saving: "Saving…", saved: "Saved", failed: "Could not sync. Your draft has not been discarded." };
  return <>
    <div role={state.status === "failed" ? "alert" : "status"} aria-live="polite" className="card" style={{ marginBottom: 16 }}>
      {labels[state.status]}
      {state.status === "failed" && <>
        {state.error === "conflict" ? <>
          <p>{es ? "Hay otra versión guardada. Exporta tu borrador antes de cargarla." : "Another version was saved. Export your draft before loading it."}</p>
          <button onClick={downloadSessionDraft}>{es ? "Exportar borrador" : "Export draft"}</button>{" "}
          <button onClick={() => { if (window.confirm(es ? "¿Descartar este borrador y cargar la versión guardada?" : "Discard this draft and load the saved version?")) void discardDraftAndReload(); }}>{es ? "Cargar versión guardada" : "Load saved version"}</button>
        </> : <button onClick={() => void retrySession()}>{es ? "Reintentar" : "Retry"}</button>}
      </>}
    </div>
    {state.ready && shopsReady ? children : null}
  </>;
}
