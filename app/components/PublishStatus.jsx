"use client";
import { useState, useSyncExternalStore } from "react";
import { getShopStatus, subscribeShops, retryShop, saveShop } from "../lib/shop-store";
import { useLang } from "../lib/i18n";
const INITIAL = { status: "ready", error: null };
export default function PublishStatus({ handle, shop, onChange }) {
  const es = useLang() === "es";
  const state = useSyncExternalStore(subscribeShops, () => getShopStatus(handle), () => INITIAL);
  const [phone, setPhone] = useState(shop.contact?.whatsapp || "");
  const [error, setError] = useState("");
  const labels = es
    ? { ready: "Publicación pendiente de verificar", saving: "Publicando…", published: "Versión guardada en el servidor", failed: "No se ha confirmado la publicación. Tu borrador sigue aquí." }
    : { ready: "Publication not yet verified", saving: "Publishing…", published: "Saved on the server", failed: "Publication is not confirmed. Your draft is still here." };
  function submit(event) {
    event.preventDefault();
    const number = phone.replace(/[\s()+-]/g, "");
    if (number && !/^[1-9][0-9]{6,14}$/.test(number)) {
      setError(es ? "Incluye el código de país y entre 7 y 15 dígitos." : "Include the country code and 7–15 digits.");
      return;
    }
    setError("");
    onChange(saveShop(handle, { ...shop, contact: { ...shop.contact, whatsapp: number } }));
    setPhone(number);
  }
  return <section className="card" aria-label={es ? "Publicación y contacto" : "Publication and contact"}>
    <div role={state.status === "failed" ? "alert" : "status"}>{labels[state.status]}</div>
    {state.status === "failed" && <>
      <p>{state.error === "handle_taken"
        ? (es ? "Este enlace pertenece a otra cuenta. No se sobrescribió." : "This handle belongs to another account. It was not overwritten.")
        : state.error === "invalid_shop" || state.error === "too_large"
        ? (es ? "Revisa los campos y el tamaño de las imágenes antes de reintentar." : "Check the fields and image sizes before retrying.")
        : (es ? "Revisa tu conexión y vuelve a intentarlo." : "Check your connection and try again.")}</p>
      <button type="button" onClick={() => void retryShop(handle)}>{es ? "Reintentar publicación" : "Retry publication"}</button>
    </>}
    <form onSubmit={submit} style={{ marginTop: 16 }}>
      <label htmlFor="merchant-whatsapp">{es ? "WhatsApp del negocio (con código de país)" : "Business WhatsApp (with country code)"}</label>
      <input id="merchant-whatsapp" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} aria-describedby="merchant-whatsapp-help" />
      <p id="merchant-whatsapp-help" className="muted">{es ? "Este número será público. Déjalo vacío para desactivar el contacto por WhatsApp." : "This number will be public. Leave it empty to disable WhatsApp contact."}</p>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="btn">{es ? "Guardar contacto público" : "Save public contact"}</button>
    </form>
  </section>;
}
