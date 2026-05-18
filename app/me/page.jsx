"use client";

// /me — her dashboard. Shows her current shop, her drafted message, her
// marketing plan, and a chat with Sol-the-Builder for adding new sections.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { loadSession, defaultSession } from "../lib/session";
import { loadShop, addSection, removeSection, myHandle } from "../lib/shop-store";

const SECTION_PROMPTS = [
  "What should I add next?",
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

  function acceptProposed() {
    if (!proposed || !handle) return;
    const updated = addSection(handle, proposed);
    setShop(updated);
    setProposed(null);
    const ack = {
      role: "assistant",
      content: `Done. I added a ${proposed.type} section to your page. Open your page to see it. What's next?`,
      proposedSection: null,
      quickReplies: ["What else should I add?", "Show me my page", "I'm good for now"],
    };
    setMessages((prev) => [...prev, ack]);
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
        <p className="muted">
          Spend 10 minutes with Sol to get your first one.
        </p>
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
                <li key={s.id}>
                  <strong>{s.title}</strong>{" "}
                  <span className="muted">({s.type})</span>{" "}
                  <button
                    className="btn ghost small"
                    onClick={() => removeExistingSection(s.id)}
                    style={{ marginLeft: 8, padding: "2px 8px" }}
                  >
                    Remove
                  </button>
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
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={acceptProposed}>Looks good — add it to my page</button>
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
    return (
      <ul className="clean">
        {(d.captions || []).map((c, i) => (
          <li key={i} className="muted">{c}</li>
        ))}
      </ul>
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
