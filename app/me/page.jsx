"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { loadSession, defaultSession } from "../lib/session";
import { loadShop, addSection, removeSection, updateSection, myHandle } from "../lib/shop-store";

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const SECTION_PROMPTS = [
  "What should I add next?",
  "Add a photo",
  "Add a testimonial",
  "Add another service",
  "Add an FAQ",
  "Add a promo banner",
  "Add my Instagram link",
];

export default function MePage() {
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
      setErrorMsg("Connection hiccup. Try sending again.");
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
    const ack = {
      role: "assistant",
      content: `Done. I added a ${toSave.type} section to your page. Open your page to see it. What's next?`,
      proposedSection: null,
      quickReplies: ["What else should I add?", "Show me my page", "I'm good for now"],
    };
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
    send("Show me a different option");
  }

  function removeExistingSection(id) {
    if (!handle) return;
    const updated = removeSection(handle, id);
    setShop(updated);
  }

  if (!ready) return <div className="card">Loading…</div>;

  if (!handle || !shop) {
    return (
      <>
        <h1>You don&apos;t have a page yet</h1>
        <p className="muted">Spend 10 minutes with Sol to get your first one.</p>
        <Link href="/start" className="btn">Start with Sol →</Link>
      </>
    );
  }

  const sections = shop.sections || [];
  const ownerLabel = shop.showRealName ? (shop.ownerRealName || shop.ownerPublicName) : shop.ownerPublicName;

  return (
    <>
      <span className="pill">Your dashboard</span>
      <h1>Welcome back, {ownerLabel}.</h1>
      <p className="muted">
        Your page is at <Link href={`/shop/${handle}`}>/shop/{handle}</Link>.
        This is where you can add to it, change it, and see what you&apos;ve made.
      </p>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Your offer</h3>
          <p><strong>{shop.offer?.name}</strong></p>
          <p className="muted">{shop.offer?.description}</p>
          <p>
            {shop.offer?.priceLocal || (shop.offer?.priceUSD ? `USD ${shop.offer.priceUSD}` : "")}
            {" · "}
            {shop.offer?.deliveryWindow}
          </p>
        </div>
        <div className="card sage">
          <h3 style={{ marginTop: 0 }}>Sections on your page</h3>
          {sections.length === 0 ? (
            <p className="muted">Nothing extra yet. Sol can help you add things below.</p>
          ) : (
            <ul className="clean">
              {sections.map((s) => (
                <li key={s.id} style={{ marginBottom: 12 }}>
                  <strong>{s.title}</strong>{" "}
                  <span className="muted">({s.type})</span>{" "}
                  <button
                    className="btn ghost small"
                    onClick={() => removeExistingSection(s.id)}
                    style={{ marginLeft: 8, padding: "2px 8px" }}
                  >
                    Remove
                  </button>
                  {s.type === "gallery" && (
                    <PhotoManager
                      section={s}
                      onPhotosChange={(photos) =>
                        patchExistingSection(s.id, { data: { ...s.data, photos } })
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link href={`/shop/${handle}`} className="btn small">See your page →</Link>
        </div>
      </div>

      <div className="card warm">
        <span className="pill">Talk to Sol — the builder</span>
        <h3 style={{ marginTop: 8 }}>Make your page better, one piece at a time</h3>
        <p className="muted">
          Tell Sol what you&apos;d like to add. She&apos;ll propose one thing at a time and only add it
          if you say yes.
        </p>

        <div
          ref={scrollRef}
          className="card tight"
          style={{ maxHeight: 360, overflowY: "auto", marginTop: 10 }}
        >
          <div className="chat">
            {messages.length === 0 && (
              <div className="msg agent">
                <div className="who">Sol</div>
                <div>
                  Hi {ownerLabel}. Want me to suggest something to add to your page? Or tell me what
                  you have in mind.
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role === "user" ? "user" : "agent"}`}>
                <div className="who">{m.role === "user" ? "You" : "Sol"}</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                {m.notice && (
                  <div className="safety" style={{ marginTop: 8, fontSize: 12 }}>
                    {m.notice}
                  </div>
                )}
              </div>
            ))}
            {pending && (
              <div className="msg agent">
                <div className="who">Sol</div>
                <div style={{ opacity: 0.7 }}>thinking…</div>
              </div>
            )}
          </div>
        </div>

        {proposed && (
          <div className="card" style={{ marginTop: 10 }}>
            <span className="pill">Sol proposes — {proposed.type}</span>
            <h4 style={{ marginTop: 8 }}>{proposed.title}</h4>
            <SectionPreview section={proposed} />
            {proposed.type === "gallery" && (
              <PhotoManager
                section={proposed}
                onPhotosChange={(photos) => updateProposedData({ photos })}
                compact
              />
            )}
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={() => acceptProposed()}>Looks good — add it to my page</button>
              <button className="btn ghost" onClick={rejectProposed}>Show me a different one</button>
            </div>
          </div>
        )}

        <div className="row" style={{ marginTop: 10 }}>
          {SECTION_PROMPTS.map((q) => (
            <button key={q} className="btn ghost small" onClick={() => send(q)} disabled={pending}>
              {q}
            </button>
          ))}
        </div>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Or tell Sol what you'd like to add or change…"
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
            {pending ? "Sending…" : "Send"}
          </button>
          <Link href={`/shop/${handle}`} className="btn ghost">See your page →</Link>
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
        {d.until && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Ends {d.until}</p>}
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
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 6, background: "rgba(255,255,255,0.6)" }}>
              {p.url ? (
                <img src={p.url} alt={p.caption || ""} style={{ width: "100%", borderRadius: 6, display: "block" }} />
              ) : (
                <div style={{ height: 80, borderRadius: 6, background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 12, textAlign: "center", padding: 6 }}>
                  {p.caption || "Add a photo"}
                </div>
              )}
              {p.url && p.caption && (
                <p className="muted" style={{ fontSize: 11, margin: "4px 0 0" }}>{p.caption}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (section.type === "booking") {
    return (
      <p>
        <strong>{d.label}</strong>
        {d.url ? <> — <a href={d.url}>{d.url}</a></> : <span className="muted"> (you&apos;ll add your booking link here)</span>}
      </p>
    );
  }
  if (section.type === "newsletter") {
    return (
      <p className="muted">
        <strong>{d.label}</strong> — {d.prompt}
      </p>
    );
  }
  if (section.type === "social") {
    return (
      <ul className="clean">
        {(d.links || []).map((l, i) => (
          <li key={i}>
            <strong>{l.platform}</strong>: {l.url || <span className="muted">(add your link)</span>}
          </li>
        ))}
      </ul>
    );
  }
  return <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(d, null, 2)}</pre>;
}

function PhotoManager({ section, onPhotosChange, compact }) {
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

  function removeAt(i) {
    commit(photos.filter((_, idx) => idx !== i));
  }

  function setCaptionAt(i, caption) {
    commit(photos.map((p, idx) => (idx === i ? { ...p, caption } : p)));
  }

  return (
    <div style={{ marginTop: compact ? 12 : 8, padding: compact ? 10 : 8, borderRadius: 10, background: "rgba(0,0,0,0.03)" }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
        Photos in this gallery
      </div>

      {photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 10 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 6, background: "#fff", position: "relative" }}>
              {p.url ? (
                <img src={p.url} alt={p.caption || ""} style={{ width: "100%", borderRadius: 6, display: "block" }} />
              ) : (
                <div style={{ height: 80, borderRadius: 6, background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 12, textAlign: "center", padding: 6 }}>
                  {p.caption || "(no photo yet)"}
                </div>
              )}
              <input
                value={p.caption || ""}
                onChange={(e) => setCaptionAt(i, e.target.value)}
                placeholder="caption (optional)"
                style={{ width: "100%", fontSize: 12, padding: 4, marginTop: 4, borderRadius: 4, border: "1px solid var(--line)", background: "#fff" }}
              />
              <button
                className="btn ghost small"
                onClick={() => removeAt(i)}
                style={{ marginTop: 4, fontSize: 11, padding: "2px 6px" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gap: 6 }}>
        <input
          type="file"
          accept="image/*"
          ref={fileRef}
          onChange={onFile}
          disabled={busy}
          style={{ fontSize: 13 }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="…or paste a photo URL"
            style={{ flex: "1 1 200px", fontSize: 13, padding: 8, borderRadius: 8, border: "1px solid var(--line)", background: "#fff" }}
          />
          <input
            value={captionDraft}
            onChange={(e) => setCaptionDraft(e.target.value)}
            placeholder="caption (optional)"
            style={{ flex: "1 1 150px", fontSize: 13, padding: 8, borderRadius: 8, border: "1px solid var(--line)", background: "#fff" }}
          />
          <button className="btn small" onClick={addFromUrl} disabled={!urlDraft.trim()}>
            Add URL
          </button>
        </div>
        <p className="muted" style={{ fontSize: 11, margin: 0 }}>
          Photos are stored locally in your browser. Keep them small — under 1MB each for best results.
        </p>
      </div>
    </div>
  );
}
