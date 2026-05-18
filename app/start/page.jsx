"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadSession, saveSession, defaultSession } from "../lib/session";
import { useT } from "../lib/i18n";

const CHANNELS = [
  "WhatsApp",
  "Instagram",
  "TikTok",
  "Facebook",
  "Web / browser",
  "Email",
  "LinkedIn",
  "YouTube",
  "Phone only",
];
const HOURS = ["1-2", "3-4", "5-10", "10-20", "20+"];
const OFFER_TYPE_IDS = ["service", "product", "class", "content", "unsure"];

export default function StartIntake() {
  const router = useRouter();
  const t = useT();
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

  if (!ready) return <div className="card">{t("common.loading")}</div>;

  const i = s.intake;
  const STEPS = [
    {
      title: t("intake.step1.title"),
      body: (
        <>
          <p className="muted">{t("intake.step1.intro")}</p>
          <label className="field">{t("intake.q.nameLabel")}</label>
          <input value={i.name} onChange={(e) => update("name", e.target.value)} placeholder={t("intake.q.namePlaceholder")} />
          <label className="field">{t("intake.q.ideaLabel")}</label>
          <textarea value={i.askedFor} onChange={(e) => update("askedFor", e.target.value)} placeholder={t("intake.q.ideaPlaceholder")} />
        </>
      ),
    },
    {
      title: t("intake.step2.title"),
      body: (
        <>
          <p className="muted">{t("intake.step2.intro")}</p>
          <label className="field">{t("intake.q.skillsLabel")}</label>
          <textarea value={i.skills} onChange={(e) => update("skills", e.target.value)} placeholder={t("intake.q.skillsPlaceholder")} />
          <label className="field">{t("intake.q.offerTypeLabel")}</label>
          <div style={{ display: "grid", gap: 8 }}>
            {OFFER_TYPE_IDS.map((id) => (
              <div key={id} className={"option " + (i.offerType === id ? "selected" : "")} onClick={() => update("offerType", id)}>
                {t(`intake.offerType.${id}`)}
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      title: t("intake.step3.title"),
      body: (
        <>
          <label className="field">{t("intake.q.hoursLabel")}</label>
          <div className="row">
            {HOURS.map((h) => (
              <div key={h} className={"option " + (i.hoursPerWeek === h ? "selected" : "")} onClick={() => update("hoursPerWeek", h)}>
                {h} {t("intake.hours.suffix")}
              </div>
            ))}
          </div>
          <label className="field">{t("intake.q.channelsLabel")}</label>
          <div className="row">
            {CHANNELS.map((c) => (
              <div key={c} className={"option " + (i.channels.includes(c) ? "selected" : "")} onClick={() => toggleChannel(c)}>
                {c}
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      title: t("intake.step4.title"),
      body: (
        <>
          <div className="safety" style={{ marginBottom: 14 }}>{t("intake.step4.intro")}</div>
          <label className="field">{t("intake.q.safetyLabel")}</label>
          <textarea value={i.safetyNotes} onChange={(e) => update("safetyNotes", e.target.value)} placeholder={t("intake.q.safetyPlaceholder")} />
          <label className="field">{t("intake.q.realNameLabel")}</label>
          <div className="row">
            <div className={"option " + (i.showRealName ? "selected" : "")} onClick={() => update("showRealName", true)}>{t("intake.realName.yes")}</div>
            <div className={"option " + (!i.showRealName ? "selected" : "")} onClick={() => update("showRealName", false)}>{t("intake.realName.no")}</div>
          </div>
          <label className="field">{t("intake.q.publicNameLabel")}</label>
          <input value={i.publicName} onChange={(e) => update("publicName", e.target.value)} placeholder={t("intake.q.publicNamePlaceholder")} />
        </>
      ),
    },
  ];

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <>
      <span className="pill">{t("intake.progress", { step: step + 1, total: STEPS.length })}</span>
      <h1>{current.title}</h1>
      <div className="card">{current.body}</div>
      <div className="row">
        {step > 0 && <button className="btn ghost" onClick={back}>{t("intake.btnBack")}</button>}
        {!last && <button className="btn" onClick={next}>{t("intake.btnContinue")}</button>}
        {last && <button className="btn" onClick={finish}>{t("intake.btnMeetCoach")}</button>}
        <Link href="/" className="btn ghost">{t("intake.btnSave")}</Link>
      </div>
      <p className="muted" style={{ marginTop: 18, fontSize: 13 }}>{t("intake.footnote")}</p>
    </>
  );
}
