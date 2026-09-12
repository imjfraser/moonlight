"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { loadSession, saveSession, defaultSession, getSessionCacheScope, invalidateSessionIdentity, subscribeSession, getSessionStatus } from "../lib/session";
import { useT, useLang } from "../lib/i18n";
import { boundedCoachHistory } from "../lib/coach-contract.mjs";
import { journeyView, hasIntake, appendCoachReply, resetCoachJourney, missingShopDraft, waitForJourneySave } from "../lib/coach-journey.mjs";
import { hydrateShops, loadShop, saveShop, retryShop, getShopStatus } from "../lib/shop-store";
import CoachPublication from "../components/CoachPublication";

const INITIAL_SAVE = { status: "loading", ready: false };

export default function CoachPage() {
  const t = useT();
  const lang = useLang();
  const persistence = useSyncExternalStore(subscribeSession, getSessionStatus, () => INITIAL_SAVE);
  const saveReady = persistence.status === "saved" || persistence.status === "ready";
  const [s, setS] = useState(defaultSession);
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState("greeting");
  const [quickReplies, setQuickReplies] = useState(null);
  const [proposedOffer, setProposedOffer] = useState(null);
  const [draftedMessage, setDraftedMessage] = useState(null);
  const [shopHandle, setShopHandle] = useState(null);
  const [skillGapAdvice, setSkillGapAdvice] = useState(null);
  const [marketingPlan, setMarketingPlan] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const scrollRef = useRef(null);

  const mounted = useRef(false);
  const request = useRef(null);

  function showSession(next) {
    const view = journeyView(next);
    setS(next); setMessages(view.messages); setState(view.state); setQuickReplies(view.quickReplies);
    setProposedOffer(view.proposedOffer); setDraftedMessage(view.draftedMessage);
    setShopHandle(view.shopHandle); setSkillGapAdvice(view.skillGapAdvice); setMarketingPlan(view.marketingPlan);
  }

  async function recoverPublication() {
    const scope = getSessionCacheScope();
    if (!scope) return;
    await hydrateShops();
    if (!mounted.current || getSessionCacheScope() !== scope || getShopStatus().status === "failed") return;
    const latest = loadSession();
    const handle = journeyView(latest).shopHandle;
    if (!handle) return;
    const existing = loadShop(handle);
    const fresh = missingShopDraft(latest, existing);
    if (fresh) saveShop(handle, fresh);
    else if (getShopStatus(handle).status === "failed") await retryShop(handle);
  }

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const scope = getSessionCacheScope();
    // Awaiting hydration also prevents Strict Mode's discarded effect from kicking off a request.
    void (async () => {
      await hydrateShops();
      if (cancelled || !mounted.current || getSessionCacheScope() !== scope) return;
      const cur = loadSession();
      showSession(cur); setReady(true);
      if (getShopStatus().status !== "failed") {
        const view = journeyView(cur);
        const fresh = missingShopDraft(cur, view.shopHandle ? loadShop(view.shopHandle) : null);
        if (fresh) saveShop(fresh.handle, fresh);
      }
      if (hasIntake(cur) && !(cur.coachConversation || []).length) void sendToCoach(cur);
    })();
    return () => {
      cancelled = true;
      mounted.current = false;
      request.current?.abort();
      request.current = null;
    };
    // Initialization deliberately uses the canonical store, not captured render state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending]);

  async function sendToCoach(snapshot = loadSession()) {
    if (request.current || !hasIntake(snapshot)) return;
    const sendingScope = getSessionCacheScope();
    if (!sendingScope) return;
    const controller = new AbortController();
    request.current = controller;
    const history = snapshot.coachConversation || [];
    const fingerprint = JSON.stringify(history);
    const current = () => mounted.current && request.current === controller && getSessionCacheScope() === sendingScope;
    setPending(true); setErrorMsg("");
    try {
      await waitForJourneySave(subscribeSession, getSessionStatus, controller.signal);
      if (!current()) return;
      if (JSON.stringify(loadSession().coachConversation || []) !== fingerprint) {
        showSession(loadSession());
        setErrorMsg(lang === "es" ? "La conversación cambió. Continúa desde la versión guardada." : "The conversation changed. Continue from the saved version.");
        return;
      }
      const res = await fetch("/api/coach", {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake: snapshot.intake, messages: boundedCoachHistory(history), cacheScope: sendingScope, lang }),
      });
      if (!current()) return;
      if (!res.ok) {
        const failure = await res.json().catch(() => ({}));
        if (!current()) return;
        if (res.status === 409 && failure.error === "cache_scope_mismatch") {
          invalidateSessionIdentity(); return;
        }
        const seconds = Math.max(1, Math.min(3600, Number(res.headers.get("Retry-After")) || 60));
        setErrorMsg(res.status === 429
          ? (lang === "es" ? `Espera ${seconds} segundos antes de volver a intentar.` : `Wait ${seconds} seconds before trying again.`)
          : res.status === 413
          ? (lang === "es" ? "El mensaje es demasiado grande. Acórtalo e inténtalo de nuevo." : "The message is too large. Shorten it and try again.")
          : t("common.connectionHiccup"));
        return;
      }
      const data = await res.json();
      if (!current()) return;
      const latest = loadSession();
      if (JSON.stringify(latest.coachConversation || []) !== fingerprint) {
        showSession(latest);
        setErrorMsg(lang === "es" ? "La conversación cambió. Continúa desde la versión guardada." : "The conversation changed. Continue from the saved version.");
        return;
      }
      const assistantMsg = {
        role: "assistant", content: data.message || "(no reply)", state: data.state || "greeting",
        quickReplies: data.quickReplies || null, proposedOffer: data.proposedOffer || null,
        draftedMessage: data.draftedMessage || null, shopHandle: data.shopHandle || null,
        skillGapAdvice: data.skillGapAdvice || null, marketingPlan: data.marketingPlan || null, notice: data.notice || null,
      };
      const next = appendCoachReply(latest, history, assistantMsg);
      saveSession(next); showSession(next);
      // Existing owner-edited pages are never auto-replaced by a repeated offer.
      if (assistantMsg.shopHandle || assistantMsg.proposedOffer) {
        const handle = journeyView(next).shopHandle;
        if (handle && getShopStatus().status !== "failed") {
          const fresh = missingShopDraft(next, loadShop(handle));
          if (fresh) saveShop(handle, fresh);
        }
      }
    } catch (error) {
      if (current() && error.name !== "AbortError") setErrorMsg(["journey_not_saved", "journey_save_timeout"].includes(error.message)
        ? (lang === "es" ? "Primero reintenta guardar tu conversación arriba. Tu mensaje sigue aquí." : "First retry saving your conversation above. Your message is still here.")
        : t("common.connectionHiccup"));
    } finally {
      if (current()) setPending(false);
      if (request.current === controller) request.current = null;
    }
  }

  function send(text) {
    const value = (text ?? draft).trim().slice(0, 4000);
    if (!value || request.current || !saveReady) return;
    const latest = loadSession();
    const next = { ...latest, coachConversation: [...(latest.coachConversation || []), { role: "user", content: value }] };
    saveSession(next); showSession(next); setDraft(""); setQuickReplies(null);
    void sendToCoach(next);
  }

  function retryTurn() {
    if (!request.current && saveReady) void sendToCoach(loadSession());
  }

  function copyMessage() {
    if (navigator.clipboard && draftedMessage) navigator.clipboard.writeText(draftedMessage).catch(() => setErrorMsg(lang === "es" ? "No se pudo copiar. Selecciona y copia el texto." : "Could not copy. Select and copy the text."));
  }
  function whatsappLink() {
    return draftedMessage ? `https://wa.me/?text=${encodeURIComponent(draftedMessage)}` : "#";
  }
  function copyHook() {
    if (navigator.clipboard && marketingPlan?.examplePostHook) navigator.clipboard.writeText(marketingPlan.examplePostHook).catch(() => setErrorMsg(lang === "es" ? "No se pudo copiar. Selecciona y copia el texto." : "Could not copy. Select and copy the text."));
  }
  function restart() {
    if (request.current || !window.confirm(lang === "es" ? "¿Empezar un nuevo plan? Se reemplazará esta conversación y su plan; tu página existente no se borrará." : "Start a new plan? This conversation and its plan will be replaced; your existing page will not be deleted.")) return;
    const next = resetCoachJourney(loadSession());
    saveSession(next); showSession(next); setDraft("");
    void sendToCoach(next);
  }

  if (!ready) return <div className="card">{t("common.loading")}</div>;

  if (!s.intake.name && !s.intake.skills && !s.intake.askedFor) {
    return (
      <>
        <h1>{t("coach.noIntakeTitle")}</h1>
        <p className="muted">{t("coach.noIntakeBody")}</p>
        <Link href="/start" className="btn">{t("coach.noIntakeCta")}</Link>
      </>
    );
  }

  return (
    <>
      <span className="pill">{t(`coach.stateLabel.${state}`)}{t("coach.pillSuffix")}</span>
      <h1>{t("coach.title")}</h1>

      <div ref={scrollRef} className="card" style={{ maxHeight: 480, overflowY: "auto", padding: 14 }}>
        <div className="chat">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "user" : "agent"}`}>
              <div className="who">{m.role === "user" ? (lang === "es" ? "Tú" : "You") : "Sol"}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
              {m.notice && <div className="safety" style={{ marginTop: 8, fontSize: 12 }}>{m.notice}</div>}
            </div>
          ))}
          {pending && (
            <div className="msg agent">
              <div className="who">Sol</div>
              <div style={{ opacity: 0.7 }}>{t("coach.thinking")}</div>
            </div>
          )}
        </div>
      </div>

      {proposedOffer && (
        <div className="card warm">
          <span className="pill">{t("coach.offerCard.pill")}</span>
          <h3 style={{ marginTop: 8 }}>{proposedOffer.name}</h3>
          <p style={{ marginTop: 0 }}><strong>{proposedOffer.tagline}</strong></p>
          <p>{proposedOffer.description}</p>
          <p>
            <strong>{t("coach.offerCard.priceLabel")}</strong>{" "}
            {proposedOffer.priceLocal || `USD ${proposedOffer.priceUSD}`}
            {" · "}
            <strong>{t("coach.offerCard.deliverLabel")}</strong> {proposedOffer.deliveryWindow}
          </p>
          <p style={{ marginTop: 6 }}>
            <strong>{t("coach.offerCard.firstCustomerLabel")}</strong> {proposedOffer.firstCustomer}
          </p>
          <div className="safety" style={{ marginTop: 10 }}>
            <strong>{t("coach.offerCard.scalingLabel")}</strong> {proposedOffer.scalingPath}
          </div>
        </div>
      )}

      {skillGapAdvice && (
        <div className="card sage">
          <span className="pill sage">{t("coach.skillGap.pill")}</span>
          <p style={{ marginTop: 8 }}>{skillGapAdvice}</p>
        </div>
      )}

      {marketingPlan && (
        <div className="card warm">
          <span className="pill">{t("coach.marketing.pill")}</span>
          <h3 style={{ marginTop: 8 }}>
            {marketingPlan.primaryChannel}
            {marketingPlan.secondaryChannel ? ` + ${marketingPlan.secondaryChannel}` : ""}
          </h3>
          <p><strong>{t("coach.marketing.dailyLabel")}</strong> {marketingPlan.daily}</p>
          <p><strong>{t("coach.marketing.weeklyLabel")}</strong> {marketingPlan.weekly}</p>
          {marketingPlan.aiToolsToUse && marketingPlan.aiToolsToUse.length > 0 && (
            <p><strong>{t("coach.marketing.toolsLabel")}</strong> {marketingPlan.aiToolsToUse.join(" · ")}</p>
          )}
          {marketingPlan.examplePostHook && (
            <div className="card tight" style={{ background: "rgba(0,0,0,0.04)", marginTop: 10, position: "relative" }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{t("coach.marketing.firstPost")}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{marketingPlan.examplePostHook}</div>
              <button className="btn ghost small" onClick={copyHook} style={{ position: "absolute", top: 8, right: 8 }}>
                {t("common.copy")}
              </button>
            </div>
          )}
          {marketingPlan.thirtyDayGoal && (
            <div className="safety" style={{ marginTop: 10 }}>
              <strong>{t("coach.marketing.goalLabel")}</strong> {marketingPlan.thirtyDayGoal}
            </div>
          )}
        </div>
      )}

      {draftedMessage && (
        <div className="card">
          <span className="pill">{t("coach.draftedMessage.pill")}</span>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: 12, margin: "10px 0" }}>{draftedMessage}</pre>
          <div className="row">
            <button className="btn" onClick={copyMessage}>{t("coach.draftedMessage.copyBtn")}</button>
            <a className="btn ghost" href={whatsappLink()} target="_blank" rel="noreferrer">{t("coach.draftedMessage.waBtn")}</a>
          </div>
        </div>
      )}

      {shopHandle && <CoachPublication handle={shopHandle} lang={lang} onRetry={() => void recoverPublication()} />}

      {errorMsg && <div className="safety" role="alert" style={{ marginTop: 12 }}>{errorMsg}</div>}
      {!pending && (errorMsg || messages.at(-1)?.role === "user") && <button type="button" className="btn ghost" disabled={!saveReady} onClick={retryTurn}>{lang === "es" ? "Reintentar respuesta de Sol" : "Retry Sol’s reply"}</button>}

      {(
        <div className="card tight" style={{ marginTop: 14 }}>
          {quickReplies && quickReplies.length > 0 && (
            <div className="row" style={{ marginBottom: 8 }}>
              {quickReplies.map((q, i) => (
                <button key={i} className="btn ghost small" onClick={() => send(q)} disabled={pending || !saveReady}>{q}</button>
              ))}
            </div>
          )}
          <textarea
            maxLength={4000}
            aria-label={t("coach.composer.placeholder")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("coach.composer.placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="row">
            <button className="btn" onClick={() => send()} disabled={pending || !saveReady || !draft.trim()}>
              {pending ? t("coach.composer.sending") : t("coach.composer.send")}
            </button>
            <button className="btn ghost" onClick={restart} disabled={pending || !saveReady}>{t("coach.composer.restart")}</button>
          </div>
          <p className="muted" style={{ fontSize: 12 }}>{t("coach.composer.shortcut", { kbd: "Cmd/Ctrl + Enter" })}</p>
        </div>
      )}


    </>
  );
}
