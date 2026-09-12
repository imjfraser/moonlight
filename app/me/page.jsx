"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PublishStatus from "../components/PublishStatus";
import ShopSection from "../components/ShopSection";
import { imageFileError } from "../lib/image-upload.mjs";
import { loadSession, defaultSession, getSessionCacheScope, invalidateSessionIdentity } from "../lib/session";
import { loadShop, addSection, removeSection, updateSection, myHandle } from "../lib/shop-store";
import { useT, useLang } from "../lib/i18n";

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Send only recent bounded conversation context; keep the on-screen transcript.
function builderHistory(history) {
  const out = [];
  let chars = 0;
  for (const message of history.slice(-20).reverse()) {
    const content = message.content.slice(0, 4000);
    if (chars + content.length > 32000) break;
    chars += content.length;
    out.unshift({ role: message.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

const SUGGESTION_KEYS = [
  "me.suggestion.next",
  "me.suggestion.testimonial",
  "me.suggestion.service",
  "me.suggestion.faq",
  "me.suggestion.promo",
  "me.suggestion.instagram",
];

export default function MePage() {
  const t = useT();
  const lang = useLang();
  const [ready, setReady] = useState(false);
  const [handle, setHandle] = useState(null);
  const [shop, setShop] = useState(null);
  const [session, setSession] = useState(defaultSession);

  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [proposed, setProposed] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    const h = s.shopHandle || myHandle();
    setHandle(h);
    if (h) setShop(loadShop(h));
    setReady(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending, proposed]);

  async function sendToBuilder(history) {
    const sendingScope = getSessionCacheScope();
    setPending(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: loadShop(handle),
          cacheScope: sendingScope,
          messages: builderHistory(history),
          lang,
        }),
      });
      if (getSessionCacheScope() !== sendingScope) return;
      if (!res.ok) {
        const failure = await res.json().catch(() => ({}));
        if (getSessionCacheScope() !== sendingScope) return;
        if (res.status === 401 || (res.status === 409 && failure.error === "cache_scope_mismatch")) {
          invalidateSessionIdentity();
          window.location.assign("/login");
          return;
        }
        if (res.status === 429) {
          const seconds = Math.max(1, Math.min(3600, Number(res.headers.get("Retry-After")) || 60));
          setErrorMsg(lang === "es" ? `Espera ${seconds} segundos antes de volver a intentar.` : `Wait ${seconds} seconds before trying again.`);
        } else if (res.status === 413) {
          setErrorMsg(lang === "es" ? "La página es demasiado grande. Reduce las imágenes e inténtalo de nuevo." : "The page is too large. Reduce the images and try again.");
        } else {
          setErrorMsg(t("common.connectionHiccup"));
        }
        return;
      }
      const data = await res.json();
      if (getSessionCacheScope() !== sendingScope) return;
      const assistantMsg = {
        role: "assistant",
        content: data.message || "(no reply)",
        proposedSection: data.proposedSection || null,
        quickReplies: data.quickReplies || null,
        notice: data.notice || null,
      };
      const newMessages = [...history, assistantMsg];
      setMessages(newMessages);
      setProposed(data.proposedSection || null);
    } catch {
      if (getSessionCacheScope() === sendingScope) setErrorMsg(t("common.connectionHiccup"));
    } finally {
      if (getSessionCacheScope() === sendingScope) setPending(false);
    }
  }

  function send(text) {
    const value = (text ?? draft).trim().slice(0, 4000);
    if (!value || pending) return;
    const userMsg = { role: "user", content: value };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setDraft("");
    sendToBuilder(newMessages);
  }

  function acceptProposed(maybeOverride) {
    const toSave = maybeOverride || proposed;
    if (!toSave || !handle) return;
    const updated = addSection(handle, toSave);
    setShop(updated);
    setProposed(null);
    const ack = { role: "assistant", content: `✓ ${toSave.title}`, proposedSection: null, quickReplies: null };
    setMessages((prev) => [...prev, ack]);
  }

  function updateProposedData(patch) {
    setProposed((prev) => (prev ? { ...prev, data: { ...prev.data, ...patch } } : prev));
  }

  function patchExistingSection(sectionId, patch) {
    if (!handle) return;
    const updated = updateSection(handle, sectionId, patch);
    setShop(updated);
  }

  function rejectProposed() {
    setProposed(null);
    send(lang === "es" ? "Muéstrame otra opción" : "Show me a different option");
  }

  function removeExistingSection(id) {
    if (!handle) return;
    const updated = removeSection(handle, id);
    setShop(updated);
  }

  if (!ready) return <div className="card">{t("common.loading")}</div>;

  if (!handle || !shop) {
    return (
      <>
        <h1>{t("me.noPageTitle")}</h1>
        <p className="muted">{t("me.noPageBody")}</p>
        <Link href="/start" className="btn">{t("me.noPageCta")}</Link>
      </>
    );
  }

  const sections = shop.sections || [];
  const ownerLabel = shop.showRealName ? (shop.ownerRealName || shop.ownerPublicName) : shop.ownerPublicName;

  return (
    <>
      <span className="pill">{t("nav.myPage")}</span>
      <h1>{t("me.welcome", { name: ownerLabel })}</h1>
      <p className="muted">
        {t("me.pageAt")} <Link href={`/shop/${handle}`}>/shop/{handle}</Link>.{" "}
        {t("me.intro")}
      </p>

      <PublishStatus key={handle} handle={handle} shop={shop} onChange={setShop} />

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{t("me.offerCardTitle")}</h3>
          <p><strong>{shop.offer?.name}</strong></p>
          <p className="muted">{shop.offer?.description}</p>
          <p>
            {shop.offer?.priceLocal || (shop.offer?.priceUSD ? `USD ${shop.offer.priceUSD}` : "")}
            {" · "}
            {shop.offer?.deliveryWindow}
          </p>
        </div>
        <div className="card sage">
          <h3 style={{ marginTop: 0 }}>{t("me.sectionsTitle")}</h3>
          {sections.length === 0 ? (
            <p className="muted">{t("me.sectionsEmpty")}</p>
          ) : (
            <ul className="clean">
              {sections.map((s) => (
                <li key={s.id} style={{ marginBottom: 12 }}>
                  <strong>{s.title}</strong>{" "}
                  <span className="muted">({s.type})</span>{" "}
                  <button className="btn ghost small" onClick={() => removeExistingSection(s.id)} style={{ marginLeft: 8, padding: "2px 8px" }}>
                    {t("me.sectionRemove")}
                  </button>
                  {s.type === "gallery" && (
                    <PhotoManager
                      section={s}
                      onPhotosChange={(photos) => patchExistingSection(s.id, { data: { ...s.data, photos } })}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link href={`/shop/${handle}`} className="btn small">{t("me.seePage")}</Link>
        </div>
      </div>

      <div className="card warm">
        <span className="pill">{t("me.builder.pill")}</span>
        <h3 style={{ marginTop: 8 }}>{t("me.builder.title")}</h3>
        <p className="muted">{t("me.builder.intro")}</p>

        <div ref={scrollRef} className="card tight" style={{ maxHeight: 360, overflowY: "auto", marginTop: 10 }}>
          <div className="chat">
            {messages.length === 0 && (
              <div className="msg agent">
                <div className="who">Sol</div>
                <div>{t("me.builder.welcomeGreeting", { name: ownerLabel })}</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role === "user" ? "user" : "agent"}`}>
                <div className="who">{m.role === "user" ? (lang === "es" ? "Tú" : "You") : "Sol"}</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                {m.notice && <div className="safety" style={{ marginTop: 8, fontSize: 12 }}>{m.notice}</div>}
              </div>
            ))}
            {pending && (
              <div className="msg agent">
                <div className="who">Sol</div>
                <div style={{ opacity: 0.7 }}>{t("coach.thinking")}</div>
              </div>
            )}
          </div>
        </div>

        {proposed && (
          <div className="card" style={{ marginTop: 10 }}>
            <span className="pill">{t("me.builder.proposesPill", { type: proposed.type })}</span>
            <h4 style={{ marginTop: 8 }}>{proposed.title}</h4>
            <p className="muted">{lang === "es" ? "Borrador generado: confirma precios, testimonios y promesas antes de publicarlo." : "Generated draft: confirm prices, testimonials, and promises before publishing."}</p>
            <ShopSection section={proposed} />
            {proposed.type === "gallery" && (
              <PhotoManager section={proposed} onPhotosChange={(photos) => updateProposedData({ photos })} compact />
            )}
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={() => acceptProposed()}>{t("me.builder.accept")}</button>
              <button className="btn ghost" onClick={rejectProposed}>{t("me.builder.reject")}</button>
            </div>
          </div>
        )}

        <div className="row" style={{ marginTop: 10 }}>
          {SUGGESTION_KEYS.map((key) => (
            <button key={key} className="btn ghost small" onClick={() => send(t(key))} disabled={pending}>
              {t(key)}
            </button>
          ))}
        </div>

        <textarea
          maxLength={4000}
          aria-label={t("me.builder.composerPlaceholder")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("me.builder.composerPlaceholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          style={{ marginTop: 10 }}
        />
        <div className="row">
          <button className="btn" onClick={() => send()} disabled={pending || !draft.trim()}>
            {pending ? t("coach.composer.sending") : t("coach.composer.send")}
          </button>
          <Link href={`/shop/${handle}`} className="btn ghost">{t("me.seePage")}</Link>
        </div>

        {errorMsg && <div className="safety" style={{ marginTop: 10 }}>{errorMsg}</div>}
      </div>
    </>
  );
}

function PhotoManager({ section, onPhotosChange, compact }) {
  const t = useT();
  const initial = section.data?.photos || (section.data?.captions || []).map((c) => ({ url: "", caption: c }));
  const [photos, setPhotos] = useState(initial);
  const [urlDraft, setUrlDraft] = useState("");
  const [captionDraft, setCaptionDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef(null);

  function commit(next) {
    setPhotos(next);
    onPhotosChange(next);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const problem = imageFileError(file);
    if (problem) {
      setUploadError(problem === "too_large"
        ? (t.lang === "es" ? "La imagen debe pesar 2 MiB o menos." : "Choose an image no larger than 2 MiB.")
        : (t.lang === "es" ? "Elige una imagen PNG, JPEG, WebP o GIF válida." : "Choose a valid PNG, JPEG, WebP or GIF image."));
      e.target.value = "";
      return;
    }
    setUploadError("");
    setBusy(true);
    try {
      const dataUrl = await fileToDataURL(file);
      const next = [...photos, { url: dataUrl, caption: captionDraft }];
      commit(next);
      setCaptionDraft("");
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setUploadError(t.lang === "es" ? "No se pudo leer la imagen. Inténtalo de nuevo." : "The image could not be read. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function addFromUrl() {
    if (!urlDraft.trim()) return;
    const next = [...photos, { url: urlDraft.trim(), caption: captionDraft }];
    commit(next);
    setUrlDraft("");
    setCaptionDraft("");
  }

  function removeAt(i) { commit(photos.filter((_, idx) => idx !== i)); }
  function setCaptionAt(i, caption) { commit(photos.map((p, idx) => (idx === i ? { ...p, caption } : p))); }

  return (
    <div style={{ marginTop: compact ? 12 : 8, padding: compact ? 10 : 8, borderRadius: 10, background: "rgba(0,0,0,0.03)" }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {t("me.photo.heading")}
      </div>

      {photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 10 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 6, background: "#fff", position: "relative" }}>
              {p.url ? (
                <img src={p.url} alt={p.caption || ""} style={{ width: "100%", borderRadius: 6, display: "block" }} />
              ) : (
                <div style={{ height: 80, borderRadius: 6, background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 12, textAlign: "center", padding: 6 }}>
                  {p.caption || ""}
                </div>
              )}
              <input
                aria-label={t("me.photo.captionPlaceholder")}
                value={p.caption || ""}
                onChange={(e) => setCaptionAt(i, e.target.value)}
                placeholder={t("me.photo.captionPlaceholder")}
                style={{ width: "100%", fontSize: 12, padding: 4, marginTop: 4, borderRadius: 4, border: "1px solid var(--line)", background: "#fff" }}
              />
              <button className="btn ghost small" onClick={() => removeAt(i)} style={{ marginTop: 4, fontSize: 11, padding: "2px 6px" }}>
                {t("me.photo.remove")}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gap: 6 }}>
        <input aria-label={t("me.photo.heading")} type="file" accept="image/png,image/jpeg,image/webp,image/gif" ref={fileRef} onChange={onFile} disabled={busy} style={{ fontSize: 13 }} />
        {uploadError && <p role="alert">{uploadError}</p>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input
            aria-label={t("me.photo.urlPlaceholder")}
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder={t("me.photo.urlPlaceholder")}
            style={{ flex: "1 1 200px", fontSize: 13, padding: 8, borderRadius: 8, border: "1px solid var(--line)", background: "#fff" }}
          />
          <input
            aria-label={t("me.photo.captionPlaceholder")}
            value={captionDraft}
            onChange={(e) => setCaptionDraft(e.target.value)}
            placeholder={t("me.photo.captionPlaceholder")}
            style={{ flex: "1 1 150px", fontSize: 13, padding: 8, borderRadius: 8, border: "1px solid var(--line)", background: "#fff" }}
          />
          <button className="btn small" onClick={addFromUrl} disabled={!urlDraft.trim()}>
            {t("me.photo.addUrl")}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 11, margin: 0 }}>{t("me.photo.note")}</p>
      </div>
    </div>
  );
}
