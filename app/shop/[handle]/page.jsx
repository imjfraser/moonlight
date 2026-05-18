"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { loadShop } from "../../lib/shop-store";
import { useT } from "../../lib/i18n";

export default function ShopPage() {
  const t = useT();
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

  if (!ready) return <div className="card">{t("common.loading")}</div>;

  if (!shop) {
    return (
      <>
        <h1>{t("shop.notFoundTitle")}</h1>
        <p className="muted">{t("shop.notFoundBody")}</p>
        <Link href="/architect" className="btn">{t("shop.notFoundCta")}</Link>
      </>
    );
  }

  const displayName = shop.showRealName ? (shop.ownerRealName || shop.ownerPublicName) : shop.ownerPublicName;
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
          <span style={{ fontSize: 12, letterSpacing: 1.5, color: "#7a5826" }}>{offer.tagline || ""}</span>
          <h2>{offer.name || displayName}</h2>
          <p>{offer.description}</p>
          <a className="pv-cta" href={waLink} target="_blank" rel="noreferrer">{t("shop.messageWA")}</a>
        </div>

        <div className="pv-section">
          <h3>{t("shop.about")}</h3>
          <p>{t("shop.about.body", { name: displayName })}</p>
          {!shop.showRealName && <p style={{ fontSize: 13, color: "#777" }}>{t("shop.about.privacy")}</p>}
        </div>

        <div className="pv-section">
          <h3>{t("shop.whatToOrder")}</h3>
          <ul style={{ paddingLeft: 18 }}>
            <li><strong>{offer.name}</strong> — {offer.description}</li>
            {offer.deliveryWindow && <li>{t("shop.delivered")} {offer.deliveryWindow}</li>}
            {(offer.priceLocal || offer.priceUSD) && (
              <li>{t("shop.from")} {offer.priceLocal || `USD ${offer.priceUSD}`}</li>
            )}
            {ordered.filter((s) => s.type === "service").map((s) => (
              <li key={s.id}>
                <strong>{s.data.name}</strong> — {s.data.description}
                {(s.data.priceLocal || s.data.priceUSD) && (
                  <> · {t("shop.from")} {s.data.priceLocal || `USD ${s.data.priceUSD}`}</>
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

        {ordered.filter((s) => s.type === "gallery").map((s) => {
          const photos = s.data.photos || (s.data.captions || []).map((c) => ({ url: "", caption: c }));
          const withImages = photos.filter((p) => p.url);
          return (
            <div key={s.id} className="pv-section">
              <h3>{s.title}</h3>
              {withImages.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                  {withImages.map((p, i) => (
                    <figure key={i} style={{ margin: 0 }}>
                      <img src={p.url} alt={p.caption || ""} style={{ width: "100%", borderRadius: 10, display: "block", border: "1px solid #eee" }} />
                      {p.caption && <figcaption style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{p.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#999" }}>{t("shop.photosComingSoon")}</p>
              )}
            </div>
          );
        })}

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
              <p style={{ color: "#999" }}>{t("shop.bookingComing")}</p>
            )}
          </div>
        ))}

        {ordered.filter((s) => s.type === "newsletter").map((s) => (
          <div key={s.id} className="pv-section">
            <h3>{s.title}</h3>
            <p>{s.data.prompt}</p>
            <p style={{ color: "#999", fontSize: 13 }}>{t("shop.emailComing")}</p>
          </div>
        ))}

        {ordered.filter((s) => s.type === "social").length > 0 && (
          <div className="pv-section">
            <h3>{t("shop.findMeToo")}</h3>
            <ul style={{ paddingLeft: 18 }}>
              {ordered.filter((s) => s.type === "social").flatMap((s, gi) =>
                (s.data.links || []).map((l, i) => (
                  <li key={`${gi}-${i}`}>
                    <strong>{l.platform}:</strong> {l.url ? <a href={l.url}>{l.url}</a> : <span style={{ color: "#999" }}>{t("shop.socialComing")}</span>}
                  </li>
                )),
              )}
            </ul>
          </div>
        )}

        <div className="pv-section">
          <h3>{t("shop.howToOrder")}</h3>
          <p>{t("shop.howToOrder.body")}</p>
          <a className="pv-cta" href={waLink} target="_blank" rel="noreferrer">{t("shop.messageMe")}</a>
        </div>

        <div className="pv-section" style={{ background: "#fff7ea" }}>
          <h3 style={{ marginTop: 0 }}>{t("shop.promise")}</h3>
          <p>{t("shop.promise.body")}</p>
        </div>
      </div>

      <p className="muted" style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
        {t("shop.footerMade")} <Link href="/">Luz de Luna</Link> ·{" "}
        <Link href="/me">{t("shop.footerEdit")}</Link>
      </p>
    </>
  );
}
