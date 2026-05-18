"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadSession, saveSession, defaultSession } from "../lib/session";
import { generateIdeas, generateBrief } from "../lib/generate";

export default function Architect() {
  const router = useRouter();
  const [s, setS] = useState(defaultSession);
  const [ready, setReady] = useState(false);
  const [thinking, setThinking] = useState(true);
  const [simpler, setSimpler] = useState(false);

  useEffect(() => {
    const cur = loadSession();
    if (!cur.ideas) {
      const { ideas, recommended } = generateIdeas(cur.intake);
      cur.ideas = ideas;
      cur.recommended = recommended;
      saveSession(cur);
    }
    setS(cur);
    setReady(true);
    const t = setTimeout(() => setThinking(false), 700);
    return () => clearTimeout(t);
  }, []);

  function pick(idea) {
    const brief = generateBrief(s.intake, idea);
    const next = { ...s, selectedIdea: idea, brief };
    saveSession(next);
    setS(next);
    router.push("/brief");
  }

  function regenerate() {
    const next = { ...s, ideas: null };
    saveSession(next);
    location.reload();
  }

  if (!ready) return <div className="card">Loading…</div>;

  const callsign = (s.intake.name || "friend").split(" ")[0];
  const summary = [
    s.intake.skills && `you're good at: ${s.intake.skills}`,
    s.intake.askedFor && `people ask you for: ${s.intake.askedFor}`,
    s.intake.hoursPerWeek && `about ${s.intake.hoursPerWeek} hours a week`,
    s.intake.channels?.length && `you can use ${s.intake.channels.join(", ")}`,
    s.intake.safetyNotes && `safety: ${s.intake.safetyNotes}`,
  ]
    .filter(Boolean)
    .join("; ");

  return (
    <>
      <span className="pill">Architect — your business coach</span>
      <h1>Hi {callsign}. Here's what I heard.</h1>

      <div className="chat">
        <div className="msg agent">
          <div className="who">Architect</div>
          {summary
            ? <p style={{ margin: 0 }}>So: {summary}. Did I get that right?</p>
            : <p style={{ margin: 0 }}>It sounds like you're at the very start. That's a good place to be.</p>}
        </div>

        {thinking ? (
          <div className="msg agent">
            <div className="who">Architect</div>
            <p style={{ margin: 0 }}>Thinking of small ideas that could fit you…</p>
          </div>
        ) : (
          <div className="msg agent" style={{ maxWidth: "100%" }}>
            <div className="who">Architect</div>
            <p style={{ margin: "0 0 8px" }}>
              Here are a few small businesses you could start with what you already have. None of these need money to begin.
              We can pick one and make it real together.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              {(simpler ? s.ideas.slice(0, 2) : s.ideas).map((idea, idx) => {
                const isRec = s.recommended && idea.title === s.recommended.title;
                return (
                  <div key={idx} className="option" onClick={() => pick(idea)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <strong style={{ fontSize: 16 }}>{idea.title}</strong>
                      {isRec && <span className="pill">Recommended start</span>}
                    </div>
                    <p className="muted" style={{ margin: "6px 0 4px" }}>{idea.why}</p>
                    <p style={{ margin: "4px 0", fontSize: 14 }}>
                      <strong>First small move:</strong> {idea.firstSale}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn ghost" onClick={() => setSimpler((v) => !v)}>
          {simpler ? "Show me more options" : "Make it simpler"}
        </button>
        <button className="btn ghost" onClick={regenerate}>Show me another idea</button>
        <Link href="/start" className="btn ghost">← Change my answers</Link>
        {s.recommended && (
          <button className="btn" onClick={() => pick(s.recommended)}>
            Help me choose — start with the recommended one →
          </button>
        )}
      </div>

      <div className="card warm" style={{ marginTop: 22 }}>
        <h3>How the architect thinks</h3>
        <p className="muted" style={{ margin: "6px 0" }}>
          Inspired by zero-capital entrepreneurship coaching (e.g. Rebel Business School-style action-first
          methodology). The architect looks for: things you can start without money, things you can sell
          quickly to people who already trust you, and things that protect your privacy. Theory comes later
          — first sales come first.
        </p>
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
          (Mocked for prototype. A production version would use a real conversational agent
          informed by partner methodology.)
        </p>
      </div>
    </>
  );
}
