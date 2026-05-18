"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadSession, saveSession, defaultSession } from "../lib/session";

const CHANNELS = ["WhatsApp", "Instagram", "Facebook", "TikTok", "Phone only", "None"];
const HOURS = ["1-2", "3-4", "5-10", "10-20", "20+"];
const OFFER_TYPES = [
  { id: "service", label: "A service (I do something for people)" },
  { id: "product", label: "A product (I sell or make something)" },
  { id: "class",   label: "A class or lessons (I teach something)" },
  { id: "content", label: "Content (videos, voice notes, writing)" },
  { id: "unsure",  label: "I'm not sure yet" },
];

export default function StartIntake() {
  const router = useRouter();
  const [s, setS] = useState(defaultSession);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setS(loadSession());
    setReady(true);
  }, []);

  function update(field, value) {
    setS((prev) => {
      const next = { ...prev, intake: { ...prev.intake, [field]: value } };
      saveSession(next);
      return next;
    });
  }

  function toggleChannel(ch) {
    setS((prev) => {
      const has = prev.intake.channels.includes(ch);
      const channels = has ? prev.intake.channels.filter((c) => c !== ch) : [...prev.intake.channels, ch];
      const next = { ...prev, intake: { ...prev.intake, channels } };
      saveSession(next);
      return next;
    });
  }

  function next() { setStep((n) => Math.min(n + 1, STEPS.length - 1)); }
  function back() { setStep((n) => Math.max(n - 1, 0)); }
  function finish() { router.push("/architect"); }

  if (!ready) return <div className="card">Loading…</div>;

  const i = s.intake;
  const STEPS = [
    {
      title: "Hello — let's start small.",
      body: (
        <>
          <p className="muted">
            We'll ask a few simple questions. There are no wrong answers. You can change anything later.
          </p>
          <label className="field">What name would you like to be called?</label>
          <input
            value={i.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Just a first name is fine"
          />
          <label className="field">Do you have a business idea already, or do you want help finding one?</label>
          <textarea
            value={i.askedFor}
            onChange={(e) => update("askedFor", e.target.value)}
            placeholder="e.g. people often ask me to braid their hair, or I'm not sure yet"
          />
        </>
      ),
    },
    {
      title: "What are you good at?",
      body: (
        <>
          <p className="muted">
            Anything you do well counts — cooking, listening, fixing, selling, teaching, making.
          </p>
          <label className="field">List a few things you're good at, in your own words</label>
          <textarea
            value={i.skills}
            onChange={(e) => update("skills", e.target.value)}
            placeholder="e.g. I cook well, I'm patient with kids, I can sew, I'm good at making people feel welcome"
          />
          <label className="field">What kind of business sounds most like you?</label>
          <div style={{ display: "grid", gap: 8 }}>
            {OFFER_TYPES.map((o) => (
              <div
                key={o.id}
                className={"option " + (i.offerType === o.id ? "selected" : "")}
                onClick={() => update("offerType", o.id)}
              >
                {o.label}
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      title: "Your time and tools",
      body: (
        <>
          <label className="field">How many hours each week could you give to this?</label>
          <div className="row">
            {HOURS.map((h) => (
              <div
                key={h}
                className={"option " + (i.hoursPerWeek === h ? "selected" : "")}
                onClick={() => update("hoursPerWeek", h)}
              >
                {h} hours
              </div>
            ))}
          </div>
          <label className="field">Which of these can you use? (pick any that apply)</label>
          <div className="row">
            {CHANNELS.map((c) => (
              <div
                key={c}
                className={"option " + (i.channels.includes(c) ? "selected" : "")}
                onClick={() => toggleChannel(c)}
              >
                {c}
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      title: "Safety and privacy",
      body: (
        <>
          <div className="safety" style={{ marginBottom: 14 }}>
            You are in control of what gets shared. We will hide what you ask to hide.
          </div>
          <label className="field">Are there safety or privacy worries we should think about?</label>
          <textarea
            value={i.safetyNotes}
            onChange={(e) => update("safetyNotes", e.target.value)}
            placeholder="e.g. don't show my full name, don't show my area, don't show my photo"
          />
          <label className="field">Do you want your real name shown on your business page?</label>
          <div className="row">
            <div
              className={"option " + (i.showRealName ? "selected" : "")}
              onClick={() => update("showRealName", true)}
            >Yes, my real name is fine</div>
            <div
              className={"option " + (!i.showRealName ? "selected" : "")}
              onClick={() => update("showRealName", false)}
            >No, please use a first name or nickname</div>
          </div>
          <label className="field">A public name to use (optional)</label>
          <input
            value={i.publicName}
            onChange={(e) => update("publicName", e.target.value)}
            placeholder="e.g. Amina, or Little Moon Kitchen"
          />
        </>
      ),
    },
  ];

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <>
      <span className="pill">Guided intake — step {step + 1} of {STEPS.length}</span>
      <h1>{current.title}</h1>
      <div className="card">{current.body}</div>

      <div className="row">
        {step > 0 && <button className="btn ghost" onClick={back}>← Back</button>}
        {!last && <button className="btn" onClick={next}>Continue →</button>}
        {last && <button className="btn" onClick={finish}>Meet your coach →</button>}
        <Link href="/" className="btn ghost">Save &amp; close</Link>
      </div>

      <p className="muted" style={{ marginTop: 18, fontSize: 13 }}>
        Your answers are saved only in this browser session for the prototype demo. Nothing is sent anywhere.
      </p>
    </>
  );
}
