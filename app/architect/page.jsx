"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadSession, saveSession, defaultSession } from "../lib/session";

// Real coach UI. Talks to /api/coach which calls Claude.
// One question at a time. Mobile-first. The coach drives the flow via the
// "state" field; this UI just renders.

const STATE_LABEL = {
  greeting: "Hello",
  skill_exploration: "What you do well",
  first_customer_id: "Your first customer",
  offer_proposal: "Your first offer",
  action_drafted: "Your first message",
  marketing_plan: "Your marketing plan",
  done: "Ready to send",
};

export default function CoachPage() {
  const router = useRouter();
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

  useEffect(() => {
    const cur = loadSession();
    setS(cur);
    setReady(true);
    if (!cur.coachConversation || cur.coachConversation.length === 0) {
      sendToCoach([], cur.intake);
    } else {
      setMessages(cur.coachConversation);
      const last = [...cur.coachConversation].reverse().find((m) => m.role === "assistant");
      if (last) {
        setState(last.state || "greeting");
        setQuickReplies(last.quickReplies || null);
        setProposedOffer(last.proposedOffer || null);
        setDraftedMessage(last.draftedMessage || null);
        setShopHandle(last.shopHandle || null);
        setSkillGapAdvice(last.skillGapAdvice || null);
        setMarketingPlan(last.marketingPlan || null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  async function sendToCoach(history, intake) {
    setPending(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intake: intake || s.intake,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const assistantMsg = {
        role: "assistant",
        content: data.message || "(no reply)",
        state: data.state || "greeting",
        quickReplies: data.quickReplies || null,
        proposedOffer: data.proposedOffer || null,
        draftedMessage: data.draftedMessage || null,
        shopHandle: data.shopHandle || null,
        skillGapAdvice: data.skillGapAdvice || null,
        marketingPlan: data.marketingPlan || null,
        notice: data.notice || null,
      };
      const newMessages = [...history, assistantMsg];
      setMessages(newMessages);
      setState(assistantMsg.state);
      setQuickReplies(assistantMsg.quickReplies);
      if (assistantMsg.proposedOffer) setProposedOffer(assistantMsg.proposedOffer);
      if (assistantMsg.draftedMessage) setDraftedMessage(assistantMsg.draftedMessage);
      if (assistantMsg.shopHandle) setShopHandle(assistantMsg.shopHandle);
      if (assistantMsg.skillGapAdvice) setSkillGapAdvice(assistantMsg.skillGapAdvice);
      if (assistantMsg.marketingPlan) setMarketingPlan(assistantMsg.marketingPlan);

      const next = {
        ...s,
        intake: intake || s.intake,
        coachConversation: newMessages,
        coachState: assistantMsg.state,
        proposedOffer: assistantMsg.proposedOffer || proposedOffer,
        draftedMessage: assistantMsg.draftedMessage || draftedMessage,
        shopHandle: assistantMsg.shopHandle || shopHandle,
        skillGapAdvice: assistantMsg.skillGapAdvice || skillGapAdvice,
        marketingPlan: assistantMsg.marketingPlan || marketingPlan,
      };

      const finalHandle = assistantMsg.shopHandle || shopHandle;
      const finalOffer = assistantMsg.proposedOffer || proposedOffer;
      if (finalHandle && finalOffer && typeof window !== "undefined") {
        const shopRec = {
          handle: finalHandle,
          ownerPublicName:
            (next.intake.publicName || next.intake.name || "").trim() || "Owner",
          showRealName: !!next.intake.showRealName,
          ownerRealName: next.intake.name || "",
          offer: finalOffer,
          contact: { channels: next.intake.channels || ["WhatsApp"] },
          savedAt: new Date().toISOString(),
        };
        try {
          const all = JSON.parse(window.localStorage.getItem("moonlight.shops") || "{}");
          all[finalHandle] = shopRec;
          window.localStorage.setItem("moonlight.shops", JSON.stringify(all));
        } catch {}
      }

      saveSession(next);
      setS(next);
    } catch (e) {
      console.error(e);
      setErrorMsg("Connection hiccup. Tap send to try again.");
    } finally {
      setPending(false);
    }
  }

  function send(text) {
    const value = (text ?? draft).trim();
    if (!value || pending) return;
    const userMsg = { role: "user", content: value };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setDraft("");
    setQuickReplies(null);
    sendToCoach(newMessages);
  }

  function copyMessage() {
    if (typeof navigator !== "undefined" && navigator.clipboard && draftedMessage) {
      navigator.clipboard.writeText(draftedMessage);
    }
  }

  function whatsappLink() {
    if (!draftedMessage) return "#";
    return `https://wa.me/?text=${encodeURIComponent(draftedMessage)}`;
  }

  function copyHook() {
    if (typeof navigator !== "undefined" && navigator.clipboard && marketingPlan?.examplePostHook) {
      navigator.clipboard.writeText(marketingPlan.examplePostHook);
    }
  }

  function restart() {
    const next = {
      ...s,
      coachConversation: [],
      coachState: null,
      proposedOffer: null,
      draftedMessage: null,
      shopHandle: null,
      skillGapAdvice: null,
      marketingPlan: null,
    };
    saveSession(next);
    setMessages([]);
    setState("greeting");
    setQuickReplies(null);
    setProposedOffer(null);
    setDraftedMessage(null);
    setShopHandle(null);
    setSkillGapAdvice(null);
    setMarketingPlan(null);
    setS(next);
    sendToCoach([], next.intake);
  }

  if (!ready) return <div className="card">Loading…</div>;

  if (!s.intake.name && !s.intake.skills && !s.intake.askedFor) {
    return (
      <>
        <h1>Let&apos;s start with a few questions first</h1>
        <p className="muted">
          Sol — your coach — works best with a little bit of context. Tell us a few
          quick things about yourself first.
        </p>
        <Link href="/start" className="btn">Start →</Link>
      </>
    );
  }

  return (
    <>
      <span className="pill">{STATE_LABEL[state] || "Coach"} · with Sol</span>
      <h1>Sol — your coach</h1>

      <div
        ref={scrollRef}
        className="card"
        style={{ maxHeight: 480, overflowY: "auto", padding: 14 }}
      >
        <div className="chat">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "user" : "agent"}`}>
              <div className="who">{m.role === "user" ? "You" : "Sol"}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
              {m.notice && (
                <div className="safety" style={{ marginTop: 8, fontSize: 12 }}>
                  {m.notice}
                </div>
              )}
            </div>
          ))}
          {pending && (
            <div className="msg agent">
              <div className="who">Sol</div>
              <div style={{ opacity: 0.7 }}>thinking…</div>
            </div>
          )}
        </div>
      </div>

      {proposedOffer && (
        <div className="card warm">
          <span className="pill">Your first offer</span>
          <h3 style={{ marginTop: 8 }}>{proposedOffer.name}</h3>
          <p style={{ marginTop: 0 }}><strong>{proposedOffer.tagline}</strong></p>
          <p>{proposedOffer.description}</p>
          <p>
            <strong>Price:</strong> {proposedOffer.priceLocal || `USD ${proposedOffer.priceUSD}`}
            {" · "}
            <strong>Deliver:</strong> {proposedOffer.deliveryWindow}
          </p>
          <p style={{ marginTop: 6 }}>
            <strong>First customer:</strong> {proposedOffer.firstCustomer}
          </p>
          <div className="safety" style={{ marginTop: 10 }}>
            <strong>How this grows to USD 2,500/month:</strong> {proposedOffer.scalingPath}
          </div>
        </div>
      )}

      {skillGapAdvice && (
        <div className="card sage">
          <span className="pill sage">Skill to add</span>
          <p style={{ marginTop: 8 }}>{skillGapAdvice}</p>
        </div>
      )}

      {marketingPlan && (
        <div className="card warm">
          <span className="pill">Your 30-day marketing engine</span>
          <h3 style={{ marginTop: 8 }}>
            {marketingPlan.primaryChannel}
            {marketingPlan.secondaryChannel ? ` + ${marketingPlan.secondaryChannel}` : ""}
          </h3>
          <p><strong>Daily:</strong> {marketingPlan.daily}</p>
          <p><strong>Weekly:</strong> {marketingPlan.weekly}</p>
          {marketingPlan.aiToolsToUse && marketingPlan.aiToolsToUse.length > 0 && (
            <p>
              <strong>Use these tools:</strong> {marketingPlan.aiToolsToUse.join(" · ")}
            </p>
          )}
          {marketingPlan.examplePostHook && (
            <div className="card tight" style={{ background: "rgba(0,0,0,0.04)", marginTop: 10, position: "relative" }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>FIRST POST — copy this</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{marketingPlan.examplePostHook}</div>
              <button className="btn ghost small" onClick={copyHook} style={{ position: "absolute", top: 8, right: 8 }}>
                Copy
              </button>
            </div>
          )}
          {marketingPlan.thirtyDayGoal && (
            <div className="safety" style={{ marginTop: 10 }}>
              <strong>30-day goal:</strong> {marketingPlan.thirtyDayGoal}
            </div>
          )}
        </div>
      )}

      {draftedMessage && (
        <div className="card">
          <span className="pill">Send this today</span>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              background: "rgba(0,0,0,0.04)",
              borderRadius: 10,
              padding: 12,
              margin: "10px 0",
            }}
          >{draftedMessage}</pre>
          <div className="row">
            <button className="btn" onClick={copyMessage}>Copy message</button>
            <a className="btn ghost" href={whatsappLink()} target="_blank" rel="noreferrer">
              Open in WhatsApp →
            </a>
          </div>
        </div>
      )}

      {shopHandle && (
        <div className="card sage">
          <span className="pill sage">Your shareable page</span>
          <h3 style={{ marginTop: 8 }}>Your page is ready</h3>
          <p>
            Share this link when someone asks &ldquo;where can I see what you do?&rdquo;
          </p>
          <Link href={`/shop/${shopHandle}`} className="btn">Open your page →</Link>
        </div>
      )}

      {errorMsg && (
        <div className="safety" style={{ marginTop: 12 }}>{errorMsg}</div>
      )}

      {state !== "done" && (
        <div className="card tight" style={{ marginTop: 14 }}>
          {quickReplies && quickReplies.length > 0 && (
            <div className="row" style={{ marginBottom: 8 }}>
              {quickReplies.map((q, i) => (
                <button
                  key={i}
                  className="btn ghost small"
                  onClick={() => send(q)}
                  disabled={pending}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your reply…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="row">
            <button className="btn" onClick={() => send()} disabled={pending || !draft.trim()}>
              {pending ? "Sending…" : "Send"}
            </button>
            <button className="btn ghost" onClick={restart} disabled={pending}>
              Start over
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            Press <span className="kbd">Cmd/Ctrl</span> + <span className="kbd">Enter</span> to send.
          </p>
        </div>
      )}

      {state === "done" && (
        <div className="row" style={{ marginTop: 14 }}>
          {shopHandle && (
            <Link href={`/shop/${shopHandle}`} className="btn">Open your page →</Link>
          )}
          <button className="btn ghost" onClick={restart}>Start a new plan</button>
        </div>
      )}
    </>
  );
}
