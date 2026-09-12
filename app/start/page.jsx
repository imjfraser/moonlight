"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useBusinessT } from "../lib/business-i18n";
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
  const bt = useBusinessT();
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
          <label className="field" htmlFor="intake-name">{t("intake.q.nameLabel")}</label>
          <input id="intake-name" value={i.name} onChange={(e) => update("name", e.target.value)} placeholder={t("intake.q.namePlaceholder")} />
          <label className="field" htmlFor="intake-askedFor">{t("intake.q.ideaLabel")}</label>
          <textarea id="intake-askedFor" value={i.askedFor} onChange={(e) => update("askedFor", e.target.value)} placeholder={t("intake.q.ideaPlaceholder")} />
        </>
      ),
    },
    {
      title: t("intake.step2.title"),
      body: (
        <>
          <p className="muted">{t("intake.step2.intro")}</p>
          <label className="field" htmlFor="intake-skills">{t("intake.q.skillsLabel")}</label>
          <textarea id="intake-skills" value={i.skills} onChange={(e) => update("skills", e.target.value)} placeholder={t("intake.q.skillsPlaceholder")} />
          <div className="field" style={{ margin: "16px 0 6px", fontWeight: 600 }} id="intake-offerType-label">{t("intake.q.offerTypeLabel")}</div>
          <div role="group" aria-labelledby="intake-offerType-label" style={{ display: "grid", gap: 8 }}>
            {OFFER_TYPE_IDS.map((id) => (
              <button type="button" aria-pressed={i.offerType === id} style={{ font: "inherit", textAlign: "left" }} key={id} className={"option " + (i.offerType === id ? "selected" : "")} onClick={() => update("offerType", id)}>
                {t(`intake.offerType.${id}`)}
              </button>
            ))}
          </div>
        </>
      ),
    },
    {
      title: t("intake.step3.title"),
      body: (
        <>
          <div className="field" style={{ margin: "16px 0 6px", fontWeight: 600 }} id="intake-hours-label">{t("intake.q.hoursLabel")}</div>
          <div className="row" role="group" aria-labelledby="intake-hours-label">
            {HOURS.map((h) => (
              <button type="button" aria-pressed={i.hoursPerWeek === h} style={{ font: "inherit" }} key={h} className={"option " + (i.hoursPerWeek === h ? "selected" : "")} onClick={() => update("hoursPerWeek", h)}>
                {h} {t("intake.hours.suffix")}
              </button>
            ))}
          </div>
          <div className="field" style={{ margin: "16px 0 6px", fontWeight: 600 }} id="intake-channels-label">{t("intake.q.channelsLabel")}</div>
          <div className="row" role="group" aria-labelledby="intake-channels-label">
            {CHANNELS.map((c) => (
              <button type="button" aria-pressed={i.channels.includes(c)} style={{ font: "inherit" }} key={c} className={"option " + (i.channels.includes(c) ? "selected" : "")} onClick={() => toggleChannel(c)}>
                {bt(c)}
              </button>
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
          <label className="field" htmlFor="intake-safetyNotes">{t("intake.q.safetyLabel")}</label>
          <textarea id="intake-safetyNotes" value={i.safetyNotes} onChange={(e) => update("safetyNotes", e.target.value)} placeholder={t("intake.q.safetyPlaceholder")} />
          <div className="field" style={{ margin: "16px 0 6px", fontWeight: 600 }} id="intake-realName-label">{t("intake.q.realNameLabel")}</div>
          <div className="row" role="group" aria-labelledby="intake-realName-label">
            <button type="button" aria-pressed={i.showRealName} style={{ font: "inherit" }} className={"option " + (i.showRealName ? "selected" : "")} onClick={() => update("showRealName", true)}>{t("intake.realName.yes")}</button>
            <button type="button" aria-pressed={!i.showRealName} style={{ font: "inherit" }} className={"option " + (!i.showRealName ? "selected" : "")} onClick={() => update("showRealName", false)}>{t("intake.realName.no")}</button>
          </div>
          <label className="field" htmlFor="intake-publicName">{t("intake.q.publicNameLabel")}</label>
          <input id="intake-publicName" value={i.publicName} onChange={(e) => update("publicName", e.target.value)} placeholder={t("intake.q.publicNamePlaceholder")} />
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
