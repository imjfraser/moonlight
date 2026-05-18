"use client";

// /shop/[handle] — the page she shares when someone asks
// "where can I see what you do?"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { loadShop } from "../../lib/shop-store";

export default function ShopPage() {
  const params = useParams();
  const handle = String(params?.handle || "").toLowerCase();
  const [ready, setReady] = useState(false);
  const [shop, setShop] = useState(null);

  useEffect(() => {
    setShop(loadShop(handle));
    setReady(true);
  }, [handle]);

  const waLink = useMemo(() => {
    if (!shop) return "#";
    const text = `Hi! I saw your ${shop.offer?.name || "page"}. Could you tell me more?`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [shop]);

  if (!ready) return <div className="card">Loading…</div>;

  if (!shop) {
    return (
      <>
        <h1>This page isn&apos;t set up yet</h1>
        <p className="muted">
          If you&apos;re the owner, finish the coach conversation first — your page
          gets generated at the end.
        </p>
        <Link href="/architect" className="btn">Go to the coach →</Link>
      </>
    );
  }

  const displayName = shop.showRealName
    ? (shop.ownerRealName || shop.ownerPublicName)
    : shop.ownerPublicName;
  const offer = shop.offer || {};
  const sections = shop.sections || [];

  const promo = sections.find((s) => s.type === "promo");
  const ordered = sections.filter((s) => s.type !== "promo");

  return (
    <>
      <div className="preview-frame" style={{ maxWidth: 520, margin: "0 auto" }}>
        {promo && (
          <div style={{ background: "linear-gradient(180deg, #f59a86 0%, #e57a3a 100%)", color: "#fff", padding: "10px 18px", textAlign: "center", fontWeight: 600 }}>
            {promo.data.headline}
            {promo.data.detail && <div style={{ fontWeight: 400, fontSize: 13, marginTop: 2 }}>{promo.data.detail}</div>}
          </div>
        )}

        <div className="pv-hero">
          <span style={{ fontSize: 12, letterSpacing: 1.5, color: "#7a5826" }}>
            {offer.tagline || "a small business"}
          </span>
          <h2>{offer.name || displayName}</h2>
          <p>{offer.description}</p>
          <a className="pv-cta" href={waLink} target="_blank" rel="noreferrer">
            Message on WhatsApp
          </a>
        </div>

        <div className="pv-section">
          <h3>About</h3>
          <p>
            I&apos;m {displayName}. I&apos;m taking on a small number of customers right now,
            so I can do a great job for each one. Send me a message and I&apos;ll reply quickly.
          </p>
          {!shop.showRealName && (
            <p style={{ fontSize: 13, color: "#777" }}>
              I keep my real name and address private. Orders are confirmed by message.
            </p>
          )}
        </div>

        <div className="pv-section">
          <h3>What you can order</h3>
          <ul style={{ paddingLeft: 18 }}>
            <li><strong>{offer.name}</strong> — {offer.description}</li>
            {offer.deliveryWindow && <li>Delivered: {offer.deliveryWindow}</li>}
            {(offer.priceLocal || offer.priceUSD) && (
              <li>From {offer.priceLocal || `USD ${offer.priceUSD}`}</li>
            )}
            {ordered.filter((s) => s.type === "service").map((s) => (
              <li key={s.id}>
                <strong>{s.data.name}</strong> — {s.data.description}
                {(s.data.priceLocal || s.data.priceUSD) && (
                  <> · From {s.data.priceLocal || `USD ${s.data.priceUSD}`}</>
                )}
              </li>
            ))}
          </ul>
        </div>

        {ordered.filter((s) => s.type === "about-extra").map((s) => (
          <div key={s.id} className="pv-section">
            <h3>{s.data.heading || s.title}</h3>
            <p>{s.data.body}</p>
          </div>
        ))}

        {ordered.filter((s) => s.type === "testimonial").map((s) => (
          <div key={s.id} className="pv-section">
            <h3>{s.title}</h3>
            <blockquote style={{ margin: 0, paddingLeft: 12, borderLeft: "3px solid #f5a623" }}>
              <p style={{ fontStyle: "italic" }}>&ldquo;{s.data.quote}&rdquo;</p>
              <p style={{ color: "#666", margin: 0 }}>— {s.data.author}</p>
            </blockquote>
          </div>
        ))}

        {ordered.filter((s) => s.type === "gallery").map((s) => (
          <div key={s.id} className="pv-section">
            <h3>{s.title}</h3>
            <ul style={{ paddingLeft: 18 }}>
              {(s.data.captions || []).map((c, i) => (
                <li key={i} style={{ color: "#666" }}>{c}</li>
              ))}
            </ul>
            <p style={{ fontSize: 12, color: "#999" }}>(Add photos to bring this to life.)</p>
          </div>
        ))}

        {ordered.filter((s) => s.type === "faq").map((s) => (
          <div key={s.id} className="pv-section">
            <h3>{s.title}</h3>
            {(s.data.items || []).map((it, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <strong>{it.q}</strong>
                <p style={{ margin: "4px 0" }}>{it.a}</p>
              </div>
            ))}
          </div>
        ))}

        {ordered.filter((s) => s.type === "booking").map((s) => (
          <div key={s.id} className="pv-section">
            <h3>{s.title}</h3>
            {s.data.url ? (
              <a className="pv-cta" href={s.data.url} target="_blank" rel="noreferrer">{s.data.label || "Book a time"}</a>
            ) : (
              <p style={{ color: "#999" }}>(Booking link coming.)</p>
            )}
          </div>
        ))}

        {ordered.filter((s) => s.type === "newsletter").map((s) => (
          <div key={s.id} className="pv-section">
            <h3>{s.title}</h3>
            <p>{s.data.prompt}</p>
            <p style={{ color: "#999", fontSize: 13 }}>(Email collection coming soon.)</p>
          </div>
        ))}

        {ordered.filter((s) => s.type === "social").length > 0 && (
          <div className="pv-section">
            <h3>Find me here too</h3>
            <ul style={{ paddingLeft: 18 }}>
              {ordered.filter((s) => s.type === "social").flatMap((s, gi) =>
                (s.data.links || []).map((l, i) => (
                  <li key={`${gi}-${i}`}>
                    <strong>{l.platform}:</strong> {l.url ? <a href={l.url}>{l.url}</a> : <span style={{ color: "#999" }}>(coming soon)</span>}
                  </li>
                )),
              )}
            </ul>
          </div>
        )}

        <div className="pv-section">
          <h3>How to order</h3>
          <p>Send a message. Tell me what you&apos;d like. I&apos;ll reply quickly and confirm.</p>
          <a className="pv-cta" href={waLink} target="_blank" rel="noreferrer">
            Message me
          </a>
        </div>

        <div className="pv-section" style={{ background: "#fff7ea" }}>
          <h3 style={{ marginTop: 0 }}>My promise</h3>
          <p>
            I do what I say I&apos;ll do, when I say I&apos;ll do it. If anything is off,
            tell me first and I&apos;ll make it right.
          </p>
        </div>
      </div>

      <p className="muted" style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
        Page made with <Link href="/">Moonlight</Link> ·{" "}
        <Link href="/me">Edit this page</Link>
      </p>
    </>
  );
}
