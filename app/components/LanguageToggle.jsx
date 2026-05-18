"use client";

import { useLang, setLang } from "../lib/i18n";

// Tiny pill toggle for EN / ES.

export default function LanguageToggle() {
  const lang = useLang();
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
        onClick={() => setLang("en")}
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
        onClick={() => setLang("es")}
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
