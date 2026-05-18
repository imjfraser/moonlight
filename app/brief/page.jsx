"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadSession, saveSession, defaultSession } from "../lib/session";
import { generateKit } from "../lib/generate";

function Row({ label, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <div className="muted" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

export default function BriefPage() {
  const router = useRouter();
  const [s, setS] = useState(defaultSession);
  const [ready, setReady] = useState(false);

  useEffect(() => { setS(loadSession()); setReady(true); }, []);

  function sendToBuilder() {
    const kit = generateKit(s.intake, s.selectedIdea, s.brief);
    const next = { ...s, kit };
    saveSession(next);
    router.push("/kit");
  }

  if (!ready) return <div className="card">Loading…</div>;
  const b = s.brief;
  if (!b) {
    return (
      <>
        <h1>No brief yet</h1>
        <p className="muted">Start a session and pick an idea first.</p>
        <Link href="/start" className="btn">Start a session →</Link>
      </>
    );
  }

  return (
    <>
      <span className="pill">Operator brief</span>
      <h1>Architect → Builder handoff</h1>
      <p className="muted">
        This is the structured plan the architect sends to the builder. It's the bridge
        between &ldquo;what we decided&rdquo; and &ldquo;what gets made.&rdquo; You can review and approve it before
        the builder starts.
      </p>

      <div className="card">
        <Row label="Business idea"><strong>{b.businessIdea}</strong></Row>
        <Row label="Why this fits">{b.why}</Row>
        <Row label="Target customer">{b.targetCustomer}</Row>
        <Row label="First product / service">{b.firstProductOrService}</Row>
        <Row label="Tone">{b.tone}</Row>
        <Row label="Privacy constraints">
          <span className="pill warn" style={{ marginRight: 6 }}>Important</span>{b.privacyConstraints}
        </Row>
        <Row label="Website sections">
          <ul className="clean" style={{ margin: 0 }}>
            {b.websiteSections.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Row>
        <Row label="Assets to generate">
          <ul className="clean" style={{ margin: 0 }}>
            {b.assetsToGenerate.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Row>
        <Row label="Next 5 actions">
          <ol className="clean" style={{ margin: 0, paddingLeft: 18 }}>
            {b.nextFiveActions.map((x, i) => <li key={i}>{x}</li>)}
          </ol>
        </Row>
      </div>

      <div className="row">
        <button className="btn" onClick={sendToBuilder}>Send to the builder →</button>
        <Link href="/architect" className="btn ghost">← Back to the architect</Link>
      </div>

      <div className="safety" style={{ marginTop: 18 }}>
        Showing this brief in the UI makes the architect → operator pattern visible. In a real
        deployment, the user wouldn't need to read it — they would just see it confirmed in plain
        language. The technical view is here for prototype testing.
      </div>
    </>
  );
}
