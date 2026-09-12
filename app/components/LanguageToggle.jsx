"use client";

import { useEffect } from "react";
import { useLang, setLang } from "../lib/i18n";

// Tiny pill toggle for EN / ES.

export default function LanguageToggle() {
  const lang = useLang();
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  function changeLanguage(next) {
    setLang(next);
    document.cookie = `moonlight.lang=${next}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    if (/^\/shop\/[^/]+\/?$/.test(window.location.pathname)) {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.location.assign(url.toString());
    }
  }
  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
        border: "1px solid var(--line)",
        borderRadius: 999,
        padding: 2,
        background: "rgba(255,255,255,0.6)",
      }}
    >
      <button
        type="button"
        onClick={() => changeLanguage("en")}
        aria-pressed={lang === "en"}
        style={{
          padding: "4px 10px",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.3,
          border: "none",
          background: lang === "en" ? "var(--accent)" : "transparent",
          color: lang === "en" ? "#2e1a04" : "var(--muted)",
          borderRadius: 999,
          cursor: "pointer",
        }}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => changeLanguage("es")}
        aria-pressed={lang === "es"}
        style={{
          padding: "4px 10px",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.3,
          border: "none",
          background: lang === "es" ? "var(--accent)" : "transparent",
          color: lang === "es" ? "#2e1a04" : "var(--muted)",
          borderRadius: 999,
          cursor: "pointer",
        }}
      >
        ES
      </button>
    </div>
  );
}
