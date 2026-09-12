"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBusinessT } from "../lib/business-i18n";
import { loadSession, defaultSession } from "../lib/session";

function CopyBlock({ children, label }) {
  const bt = useBusinessT();
  const [copyError, setCopyError] = useState(false);
  const [copied, setCopied] = useState(false);
  async function copy() {
    setCopied(false);
    setCopyError(false);
    try {
      if (!navigator.clipboard) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(typeof children === "string" ? children : "");
      setCopied(true);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className="card tight" style={{ position: "relative" }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit", color: "var(--text)" }}>{children}</pre>
      <button type="button" aria-label={`${bt("Copy")}: ${label}`} className="btn ghost small" onClick={copy} style={{ position: "absolute", top: 10, right: 10 }}>
        {copied ? bt("Copied!") : bt("Copy")}
      </button>
      <span role="status" aria-live="polite">{copyError ? bt("Could not copy. Please select and copy the text.") : copied ? bt("Copied!") : ""}</span>
    </div>
  );
}

export default function KitPage() {
  const bt = useBusinessT();
  const [s, setS] = useState(defaultSession);
  const [ready, setReady] = useState(false);
  useEffect(() => { setS(loadSession()); setReady(true); }, []);

  if (!ready) return <div className="card">{bt("Loading…")}</div>;
  const k = s.kit;
  if (!k) {
    return (
      <>
        <h1>{bt("No business kit yet")}</h1>
        <p className="muted">{bt("Continue your conversation with Sol to prepare your offer and shareable page.")}</p>
        <Link href="/architect" className="btn">{bt("Continue with Sol →")}</Link>
      </>
    );
  }

  return (
    <>
      <span className="pill">{bt("Builder output — your business kit")}</span>
      <h1>{bt("Your starter business kit")}</h1>
      <p className="muted">{bt("Here's what the builder made for you. Nothing here is permanent. You can change any word, any name, and any price. Pick what feels right; ignore what doesn't.")}</p>

      <div className="card">
        <h3>{bt("Business name ideas")}</h3>
        <ul className="clean">
          {k.nameIdeas.map((n, i) => <li key={i}>{n}{i === 0 && <> <span className="pill" style={{ marginLeft: 6 }}>{bt("builder pick")}</span></>}</li>)}
        </ul>
      </div>

      <div className="grid-2">
        <CopyBlock label={bt("One-paragraph description")}>{k.description}</CopyBlock>
        <CopyBlock label={bt("Your offer (in plain words)")}>{k.offer}</CopyBlock>
      </div>

      <div className="card">
        <h3>{bt("Starter pricing")}</h3>
        <p className="muted">{k.pricing.startingPrice}</p>
        <ul className="clean">
          {k.pricing.examples.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
        <p className="muted" style={{ fontSize: 13 }}>{k.pricing.note}</p>
      </div>

      <div className="grid-2">
        <CopyBlock label={bt("First message to send a customer")}>{k.firstCustomerMessage}</CopyBlock>
        <CopyBlock label={bt("WhatsApp status / social post")}>{k.socialPost}</CopyBlock>
      </div>

      <div className="card">
        <h3>{bt("Landing page copy (a preview)")}</h3>
        <p><strong>{k.landingCopy.heroTitle}</strong> — {k.landingCopy.heroSubtitle}</p>
        <p className="muted">{k.landingCopy.aboutShort}</p>
        <p style={{ marginTop: 8 }}>{bt("Services:")}</p>
        <ul className="clean">{k.landingCopy.services.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <Link href="/preview" className="btn small">{bt("See it on a real page →")}</Link>
      </div>

      <div className="card warm">
        <h3>{bt("Your next 5 actions (this week)")}</h3>
        <ol className="clean" style={{ paddingLeft: 18 }}>
          {k.nextFiveActions.map((x, i) => <li key={i}>{x}</li>)}
        </ol>
      </div>

      <div className="row">
        <Link href="/preview" className="btn">{bt("See your website preview →")}</Link>
        <Link href="/brief" className="btn ghost">{bt("← Back to the brief")}</Link>
      </div>
    </>
  );
}
