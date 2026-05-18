"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSession, defaultSession } from "../lib/session";

function CopyBlock({ children, label }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(typeof children === "string" ? children : "").catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }
  return (
    <div className="card tight" style={{ position: "relative" }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit", color: "var(--text)" }}>{children}</pre>
      <button className="btn ghost small" onClick={copy} style={{ position: "absolute", top: 10, right: 10 }}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default function KitPage() {
  const [s, setS] = useState(defaultSession);
  const [ready, setReady] = useState(false);
  useEffect(() => { setS(loadSession()); setReady(true); }, []);

  if (!ready) return <div className="card">Loading…</div>;
  const k = s.kit;
  if (!k) {
    return (
      <>
        <h1>No business kit yet</h1>
        <p className="muted">Send a brief to the builder first.</p>
        <Link href="/brief" className="btn">Go to the brief →</Link>
      </>
    );
  }

  return (
    <>
      <span className="pill">Builder output — your business kit</span>
      <h1>Your starter business kit</h1>
      <p className="muted">
        Here's what the builder made for you. Nothing here is permanent. You can change any
        word, any name, and any price. Pick what feels right; ignore what doesn't.
      </p>

      <div className="card">
        <h3>Business name ideas</h3>
        <ul className="clean">
          {k.nameIdeas.map((n, i) => <li key={i}>{n}{i === 0 && <> <span className="pill" style={{ marginLeft: 6 }}>builder pick</span></>}</li>)}
        </ul>
      </div>

      <div className="grid-2">
        <CopyBlock label="One-paragraph description">{k.description}</CopyBlock>
        <CopyBlock label="Your offer (in plain words)">{k.offer}</CopyBlock>
      </div>

      <div className="card">
        <h3>Starter pricing</h3>
        <p className="muted">{k.pricing.startingPrice}</p>
        <ul className="clean">
          {k.pricing.examples.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
        <p className="muted" style={{ fontSize: 13 }}>{k.pricing.note}</p>
      </div>

      <div className="grid-2">
        <CopyBlock label="First message to send a customer">{k.firstCustomerMessage}</CopyBlock>
        <CopyBlock label="WhatsApp status / social post">{k.socialPost}</CopyBlock>
      </div>

      <div className="card">
        <h3>Landing page copy (a preview)</h3>
        <p><strong>{k.landingCopy.heroTitle}</strong> — {k.landingCopy.heroSubtitle}</p>
        <p className="muted">{k.landingCopy.aboutShort}</p>
        <p style={{ marginTop: 8 }}>Services:</p>
        <ul className="clean">{k.landingCopy.services.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <Link href="/preview" className="btn small">See it on a real page →</Link>
      </div>

      <div className="card warm">
        <h3>Your next 5 actions (this week)</h3>
        <ol className="clean" style={{ paddingLeft: 18 }}>
          {k.nextFiveActions.map((x, i) => <li key={i}>{x}</li>)}
        </ol>
      </div>

      <div className="row">
        <Link href="/preview" className="btn">See your website preview →</Link>
        <Link href="/brief" className="btn ghost">← Back to the brief</Link>
      </div>
    </>
  );
}
