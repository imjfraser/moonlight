"use client";
import { useEffect } from "react";
import { setLang } from "../lib/i18n";

// Keep the shared client shell aligned with server-selected storefront language.
export default function ShopLocaleSync({ lang }) {
  useEffect(() => {
    setLang(lang);
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
