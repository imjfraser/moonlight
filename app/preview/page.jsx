"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBusinessT } from "../lib/business-i18n";
import { loadSession, defaultSession } from "../lib/session";

export default function PreviewPage() {
  const bt = useBusinessT();
  const [s, setS] = useState(defaultSession);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState("public"); // "public" | "private"

  useEffect(() => { setS(loadSession()); setReady(true); }, []);
  if (!ready) return <div className="card">{bt("Loading…")}</div>;

  const k = s.kit;
  const i = s.intake;

  // Allow this screen to be shown even without a session — use a demo fallback.
  const data = k || {
    nameIdeas: ["Little Moon Kitchen"],
    landingCopy: {
      heroTitle: "Little Moon Kitchen",
      heroSubtitle: bt("Home-cooked dishes made with care."),
      aboutShort: bt("I'm starting something small. I cook one dish a week and take orders by WhatsApp. Send me a message to order."),
      services: [bt("Dish of the week (pre-order)"), bt("Family pack"), "Special request — by message"],
      ctaText: bt("Message on WhatsApp"),
    },
  };

  const safeName = mode === "private"
    ? bt("Owner contactable via WhatsApp")
    : (i.showRealName && i.name ? i.name : (i.publicName || bt("Owner")));

  return (
    <>
      <span className="pill">{bt("Website preview")}</span>
      <h1>{bt("This is what your small business website could look like.")}</h1>
      <p className="muted">{bt("Toggle between the public version (what neighbours and customers see) and the private/safe version (extra protection for your privacy).")}</p>

      <div className="row" role="group" aria-label={bt("Preview display")}>
        <button type="button"
          aria-pressed={mode === "public"}
          className={"option " + (mode === "public" ? "selected" : "")}
          onClick={() => setMode("public")}
        >{bt("Public version")}</button>
        <button type="button"
          aria-pressed={mode === "private"}
          className={"option " + (mode === "private" ? "selected" : "")}
          onClick={() => setMode("private")}
        >{bt("Private / safe version")}</button>
      </div>

      <div className="preview-frame" style={{ marginTop: 14 }}>
        <div className="pv-hero">
          <span style={{ fontSize: 12, letterSpacing: 1.5, color: "#7a5826" }}>
            {mode === "public" ? bt("a small local business") : bt("a small local business — privacy-on")}
          </span>
          <h2>{data.landingCopy.heroTitle}</h2>
          <p>{data.landingCopy.heroSubtitle}</p>
          <span className="pv-cta">{data.landingCopy.ctaText}</span>
        </div>
        <div className="pv-section">
          <h3>{bt("About")}</h3>
          <p>{data.landingCopy.aboutShort}</p>
          <p style={{ fontSize: 13, color: "#777" }}>
            {mode === "private"
              ? bt("Real name and location are hidden. Photos are optional. Contact is by message only.")
              : bt("Owner: {name}.", { name: safeName })}
          </p>
        </div>
        <div className="pv-section">
          <h3>{bt("What you can order")}</h3>
          <ul style={{ paddingLeft: 18 }}>
            {data.landingCopy.services.map((x, idx) => <li key={idx}>{x}</li>)}
          </ul>
        </div>
        <div className="pv-section">
          <h3>{bt("How to order")}</h3>
          <p>{bt("Send a message. Tell me what you'd like. I'll reply quickly and confirm.")}</p>
          <span className="pv-cta">{bt("Message me")}</span>
        </div>
        <div className="pv-section" style={{ background: "#fff7ea" }}>
          <h3 style={{ marginTop: 0 }}>{bt("Privacy promise")}</h3>
          <p>
            {mode === "private"
              ? bt("I do not share my full name, my address, or my photo on this page. I reply to messages personally. Only the customer sees the details of their order.")
              : bt("I only share what I want to share. You will only see what I am comfortable showing.")}
          </p>
        </div>
      </div>

      <div className="card warm" style={{ marginTop: 16 }}>
        <h3>{bt("What you can change later")}</h3>
        <ul className="clean muted">
          <li>{bt("The business name")}</li>
          <li>{bt("The look (colours, photos)")}</li>
          <li>{bt("What you sell and the prices")}</li>
          <li>{bt("What is shown publicly vs. only on request")}</li>
        </ul>
      </div>

      <div className="row">
        <Link href="/kit" className="btn ghost">{bt("← Back to the business kit")}</Link>
        <Link href="/" className="btn ghost">{bt("Finish for now")}</Link>
      </div>
    </>
  );
}
