"use client";

// /shop/[handle] — the page she shares when someone asks
// "where can I see what you do?"
//
// MVP: reads the shop record from localStorage (saved by the coach screen
// when state advances to "done"). When we add a real DB, this becomes
// a server component reading from the backend.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ShopPage() {
  const params = useParams();
  const handle = String(params?.handle || "").toLowerCase();
  const [ready, setReady] = useState(false);
  const [shop, setShop] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const all = JSON.parse(window.localStorage.getItem("moonlight.shops") || "{}");
      setShop(all[handle] || null);
    } catch {
      setShop(null);
    }
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

  return (
    <>
      <div className="preview-frame" style={{ maxWidth: 520, margin: "0 auto" }}>
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
            {offer.deliveryWindow && (
              <li>Delivered: {offer.deliveryWindow}</li>
            )}
            {(offer.priceLocal || offer.priceUSD) && (
              <li>From {offer.priceLocal || `USD ${offer.priceUSD}`}</li>
            )}
          </ul>
        </div>

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
        Page made with <Link href="/">Moonlight</Link>
      </p>
    </>
  );
}
