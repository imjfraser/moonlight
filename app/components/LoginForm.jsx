"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "../lib/i18n";
import { authPaths, consumeAuthFragment, authPost } from "../lib/login-flow.mjs";

export default function LoginForm({ admin = false }) {
  const lang = useLang(), es = lang === "es";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [retryAfter, setRetryAfter] = useState(60);
  const link = useRef(undefined);
  const started = useRef(false);
  const request = useRef(null);
  function showError(problem) {
    setError(problem.message);
    setRetryAfter(problem.retryAfter || 60);
    setStatus("error");
  }
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    try {
      if (link.current === undefined) link.current = consumeAuthFragment(window.location, window.history);
    } catch (problem) { link.current = null; showError(problem); return () => { cancelled = true; }; }
    // Deferral makes Strict Mode cleanup happen before consuming a single-use token.
    queueMicrotask(async () => {
      if (cancelled || started.current) return;
      started.current = true;
      if (link.current) {
        setStatus("verifying");
        try {
          const result = await authPost(admin, "verify", { token: link.current }, fetch, controller.signal);
          link.current = null;
          if (!cancelled) window.location.assign(result.destination);
        } catch (problem) {
          link.current = null;
          if (!cancelled && problem.name !== "AbortError") showError(problem);
        }
      } else {
        try {
          const res = await fetch(authPaths(admin).base + "/me", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
          const body = res.ok ? await res.json() : {};
          if (!cancelled && body.authenticated === true) window.location.assign(authPaths(admin).destination);
        } catch {}
      }
    });
    return () => { cancelled = true; controller.abort(); request.current?.abort(); };
  }, [admin]);

  async function submit(event) {
    event.preventDefault();
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setError(""); setStatus("sending");
    try {
      await authPost(admin, "request", { email: email.trim(), lang }, fetch, controller.signal);
      if (!controller.signal.aborted) setStatus("sent");
    } catch (problem) {
      if (!controller.signal.aborted) showError(problem);
    } finally { if (request.current === controller) request.current = null; }
  }
  const busy = status === "sending" || status === "verifying";
  const explanation = error === "invalid_email"
    ? (es ? "Escribe un correo válido." : "Enter a valid email address.")
    : error === "invalid_token"
    ? (es ? "Este enlace no es válido o ya no está disponible. Solicita otro." : "This link is invalid or no longer available. Request a new one.")
    : error === "rate_limited"
    ? (es ? `Espera ${retryAfter} segundos antes de reintentar.` : `Wait ${retryAfter} seconds before trying again.`)
    : error === "email_unavailable"
    ? (es ? "No pudimos enviar el correo en este momento. Inténtalo más tarde." : "We could not send email right now. Please try later.")
    : (es ? "No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo." : "We could not complete the request. Check your connection and try again.");
  return <main className="card" aria-labelledby="login-title">
    <span className="pill">{admin ? (es ? "Administración" : "Administration") : "Luz de Luna"}</span>
    <h1 id="login-title">{admin ? (es ? "Acceso de administración" : "Admin sign-in") : (es ? "Empieza o continúa con Sol" : "Start or continue with Sol")}</h1>
    <p>{admin
      ? (es ? "Usa tu correo autorizado de administración. Este acceso es independiente de tu cuenta de participante." : "Use your authorized admin email. This access is separate from your participant account.")
      : (es ? "Usa un correo al que tengas acceso para guardar tu progreso y volver a tu programa. No necesitas contraseña." : "Use an email you can access to save your progress and return to your program. No password needed.")}</p>
    {status === "verifying" && <p role="status">{es ? "Verificando tu enlace…" : "Verifying your link…"}</p>}
    {status === "sent" && <p role="status">{es ? "Si este correo puede acceder, recibirá un enlace de acceso. Revisa también la carpeta de correo no deseado." : "If this email is eligible, it will receive a sign-in link. Check your spam folder too."}</p>}
    {error && <p role="alert">{explanation}</p>}
    <form onSubmit={submit}>
      <label className="field" htmlFor={admin ? "admin-email" : "participant-email"}>{es ? "Correo electrónico" : "Email address"}</label>
      <input id={admin ? "admin-email" : "participant-email"} type="email" name="email" autoComplete="email" inputMode="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
      <button type="submit" className="btn" style={{ marginTop: 14 }} disabled={busy}>{status === "sending" ? (es ? "Enviando…" : "Sending…") : (es ? "Enviarme un enlace de acceso" : "Email me a sign-in link")}</button>
    </form>
    <p className="muted" style={{ fontSize: 13 }}>{es ? "El enlace es temporal y solo se puede usar una vez. No lo compartas." : "The link is temporary and can only be used once. Do not share it."}</p>
    <Link href="/">{es ? "Volver al inicio" : "Back to home"}</Link>
  </main>;
}
