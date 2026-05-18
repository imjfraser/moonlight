"use client";

// Tiny i18n primitive for Luz de Luna.
// - Language is stored in localStorage and synced across tabs.
// - Components call useT() and get a translation function `t(key, vars?)`.
// - All strings live in app/lib/messages.js — Angelina edits Spanish there,
//   James edits English there, neither touches JSX for copy changes.
//
// No external i18n library — keeps the bundle small and the data flat.

import { useEffect, useState, useSyncExternalStore } from "react";
import { messages, SUPPORTED_LANGS, DEFAULT_LANG } from "./messages";

const KEY = "moonlight.lang";

// Simple event bus so all components re-render when language flips.
const listeners = new Set();
function emitChange() {
  listeners.forEach((l) => l());
}

function getStoredLang() {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const v = window.localStorage.getItem(KEY);
    if (v && SUPPORTED_LANGS.includes(v)) return v;
  } catch {}
  // Try browser language as a hint.
  if (typeof navigator !== "undefined" && navigator.language) {
    const short = navigator.language.split("-")[0];
    if (SUPPORTED_LANGS.includes(short)) return short;
  }
  return DEFAULT_LANG;
}

export function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {}
  emitChange();
}

export function getLang() {
  return getStoredLang();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return getStoredLang();
}
function getServerSnapshot() {
  return DEFAULT_LANG;
}

export function useLang() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function useT() {
  const lang = useLang();
  function t(key, vars) {
    const entry = messages[key];
    if (!entry) return key;
    const raw = entry[lang] ?? entry[DEFAULT_LANG] ?? key;
    return interpolate(raw, vars);
  }
  t.lang = lang;
  return t;
}

export function tFor(lang, key, vars) {
  const entry = messages[key];
  if (!entry) return key;
  const raw = entry[lang] ?? entry[DEFAULT_LANG] ?? key;
  return interpolate(raw, vars);
}
