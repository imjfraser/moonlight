"use client";

import Link from "next/link";
import { useT } from "./lib/i18n";

export default function Home() {
  const t = useT();
  return (
    <>
      <span className="pill">{t("landing.pill")}</span>
      <h1>{t("landing.heroTitle")}</h1>
      <p className="muted" style={{ fontSize: 17, maxWidth: 640 }}>
        {t("landing.heroBody")}
      </p>

      <div className="row">
        <Link href="/start" className="btn">{t("landing.ctaStart")}</Link>
        <Link href="/funding" className="btn ghost">{t("landing.ctaFunders")}</Link>
      </div>

      <div className="grid-2" style={{ marginTop: 22 }}>
        <div className="card">
          <h3>{t("landing.card1.title")}</h3>
          <p className="muted">{t("landing.card1.body")}</p>
        </div>
        <div className="card">
          <h3>{t("landing.card2.title")}</h3>
          <p className="muted">{t("landing.card2.body")}</p>
        </div>
        <div className="card">
          <h3>{t("landing.card3.title")}</h3>
          <p className="muted">{t("landing.card3.body")}</p>
        </div>
        <div className="card">
          <h3>{t("landing.card4.title")}</h3>
          <p className="muted">{t("landing.card4.body")}</p>
        </div>
      </div>

      <div className="card warm" style={{ marginTop: 22 }}>
        <span className="pill">{t("landing.firstStep.pill")}</span>
        <h3 style={{ marginTop: 8 }}>{t("landing.firstStep.title")}</h3>
        <p className="muted">{t("landing.firstStep.body")}</p>
        <div className="row">
          <Link href="/start" className="btn">{t("landing.firstStep.ctaStart")}</Link>
          <Link href="/preview" className="btn ghost">{t("landing.firstStep.ctaSample")}</Link>
        </div>
      </div>
    </>
  );
}
