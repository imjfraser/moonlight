"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadSession, defaultSession } from "../lib/session";
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
    setPending(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: loadShop(handle),
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          lang,
        }),
      });
      const data = await res.json();
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
    } catch (e) {
      console.error(e);
      setErrorMsg(t("common.connectionHiccup"));
    } finally {
      setPending(false);
    }
  }

  function send(text) {
    const value = (text ?? draft).trim();
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
            <SectionPreview section={proposed} />
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

function SectionPreview({ section }) {
  const d = section.data || {};
  if (section.type === "testimonial") {
    return (
      <div className="card tight" style={{ background: "rgba(0,0,0,0.04)" }}>
        <p style={{ fontStyle: "italic", margin: 0 }}>&ldquo;{d.quote}&rdquo;</p>
        <p className="muted" style={{ margin: "6px 0 0" }}>— {d.author}</p>
      </div>
    );
  }
  if (section.type === "faq") {
    return (
      <ul className="clean">
        {(d.items || []).map((it, i) => (
          <li key={i}>
            <strong>{it.q}</strong>
            <br />
            <span className="muted">{it.a}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (section.type === "promo") {
    return (
      <div className="card tight" style={{ background: "rgba(245,154,134,0.15)" }}>
        <strong>{d.headline}</strong>
        <p style={{ margin: "4px 0" }}>{d.detail}</p>
        {d.until && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{d.until}</p>}
      </div>
    );
  }
  if (section.type === "about-extra") {
    return (
      <div className="card tight" style={{ background: "rgba(0,0,0,0.04)" }}>
        <strong>{d.heading}</strong>
        <p style={{ margin: "6px 0 0" }}>{d.body}</p>
      </div>
    );
  }
  if (section.type === "service") {
    return (
      <div className="card tight" style={{ background: "rgba(0,0,0,0.04)" }}>
        <strong>{d.name}</strong>
        <p style={{ margin: "6px 0" }}>{d.description}</p>
        <p className="muted" style={{ margin: 0 }}>
          {d.priceLocal || `USD ${d.priceUSD}`} · {d.deliveryWindow}
        </p>
      </div>
    );
  }
  if (section.type === "gallery") {
    const photos = d.photos || (d.captions || []).map((c) => ({ url: "", caption: c }));
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
        {photos.map((p, i) => (
          <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 6, background: "rgba(255,255,255,0.6)" }}>
            {p.url ? (
              <img src={p.url} alt={p.caption || ""} style={{ width: "100%", borderRadius: 6, display: "block" }} />
            ) : (
              <div style={{ height: 80, borderRadius: 6, background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 12, textAlign: "center", padding: 6 }}>
                {p.caption || ""}
              </div>
            )}
            {p.url && p.caption && <p className="muted" style={{ fontSize: 11, margin: "4px 0 0" }}>{p.caption}</p>}
          </div>
        ))}
      </div>
    );
  }
  if (section.type === "booking") {
    return <p><strong>{d.label}</strong>{d.url ? <> — <a href={d.url}>{d.url}</a></> : null}</p>;
  }
  if (section.type === "newsletter") {
    return <p className="muted"><strong>{d.label}</strong> — {d.prompt}</p>;
  }
  if (section.type === "social") {
    return (
      <ul className="clean">
        {(d.links || []).map((l, i) => (
          <li key={i}><strong>{l.platform}</strong>: {l.url || ""}</li>
        ))}
      </ul>
    );
  }
  return <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(d, null, 2)}</pre>;
}

function PhotoManager({ section, onPhotosChange, compact }) {
  const t = useT();
  const initial = section.data?.photos || (section.data?.captions || []).map((c) => ({ url: "", caption: c }));
  const [photos, setPhotos] = useState(initial);
  const [urlDraft, setUrlDraft] = useState("");
  const [captionDraft, setCaptionDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  function commit(next) {
    setPhotos(next);
    onPhotosChange(next);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToDataURL(file);
      const next = [...photos, { url: dataUrl, caption: captionDraft }];
      commit(next);
      setCaptionDraft("");
      if (fileRef.current) fileRef.current.value = "";
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
        <input type="file" accept="image/*" ref={fileRef} onChange={onFile} disabled={busy} style={{ fontSize: 13 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder={t("me.photo.urlPlaceholder")}
            style={{ flex: "1 1 200px", fontSize: 13, padding: 8, borderRadius: 8, border: "1px solid var(--line)", background: "#fff" }}
          />
          <input
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
