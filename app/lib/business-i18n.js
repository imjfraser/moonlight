"use client";
import { useLang } from "./i18n";
import { businessMessages } from "./business-messages.mjs";
export function useBusinessT() {
  const lang = useLang();
  return (key, vars = {}) => {
    const text = lang === "es" ? (businessMessages[key] ?? key) : key;
    return text.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(vars, name) ? String(vars[name]) : match);
  };
}
