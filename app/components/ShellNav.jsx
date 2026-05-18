"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useT, useLang } from "../lib/i18n";
import LanguageToggle from "./LanguageToggle";

export default function ShellNav() {
  const t = useT();
  const lang = useLang();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  return (
    <nav className="top">
      <Link href="/" className="brand">
        <span className="moon" aria-hidden="true" />
        <span>Luz de Luna</span>
      </Link>
      <div className="links" style={{ alignItems: "center" }}>
        <Link href="/start">{t("nav.start")}</Link>
        <Link href="/architect">{t("nav.coach")}</Link>
        <Link href="/me">{t("nav.myPage")}</Link>
        <Link href="/funding">{t("nav.funding")}</Link>
        <LanguageToggle />
      </div>
    </nav>
  );
}
