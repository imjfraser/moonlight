"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useT } from "../../lib/i18n";
import ShopSection from "../../components/ShopSection";

export default function ShopPage() {
  const t = useT();
  const params = useParams();
  const handle = String(params?.handle || "").toLowerCase();
  const [ready, setReady] = useState(false);
  const [shop, setShop] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setReady(false);
    setLoadError(false);
    setShop(null);
    (async () => {
      try {
        const res = await fetch(`/api/shops/${encodeURIComponent(handle)}`, { cache: "no-store" });
        if (res.status === 404) return;
        if (!res.ok) throw new Error("unavailable");
        const data = await res.json();
        if (!data.shop) throw new Error("unavailable");
        if (alive) setShop(data.shop);
      } catch { if (alive) setLoadError(true); }
      finally { if (alive) setReady(true); }
    })();
    return () => { alive = false; };
  }, [handle, attempt]);

  const waLink = useMemo(() => {
    const number = shop?.contact?.whatsapp;
    if (!number || !/^[1-9][0-9]{6,14}$/.test(number)) return null;
    const text = t.lang === "es"
      ? `¡Hola! Vi tu página de ${shop.offer?.name || "negocio"}. ¿Me cuentas más?`
      : `Hi! I saw your ${shop.offer?.name || "page"}. Could you tell me more?`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }, [shop, t.lang]);

  if (!ready) return <div className="card">{t("common.loading")}</div>;

  if (loadError) return <div className="card" role="alert">
    <p>{t.lang === "es" ? "No se pudo cargar la página publicada." : "The published page could not be loaded."}</p>
    <button type="button" onClick={() => setAttempt(n => n + 1)}>{t.lang === "es" ? "Reintentar" : "Retry"}</button>
  </div>;

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
  const sectionLabels = {
    from: t("shop.from"),
    photosUnavailable: t("shop.photosComingSoon"),
    bookingUnavailable: t("shop.bookingComing"),
    emailUnavailable: t("shop.emailComing"),
    socialUnavailable: t("shop.socialComing"),
  };
  const promo = sections.find((s) => s.type === "promo");
  const ordered = sections.filter((s) => s.type !== "promo");

  return (
    <>
      <div className="preview-frame" style={{ maxWidth: 520, margin: "0 auto" }}>
        {promo && <ShopSection section={promo} variant="public" labels={sectionLabels} lang={t.lang} />}

        <div className="pv-hero">
          <span style={{ fontSize: 12, letterSpacing: 1.5, color: "#7a5826" }}>{offer.tagline || ""}</span>
          <h2>{offer.name || displayName}</h2>
          <p>{offer.description}</p>
          {waLink ? <a className="pv-cta" href={waLink} target="_blank" rel="noreferrer">{t("shop.messageWA")}</a> : <p>{t.lang === "es" ? "El contacto por WhatsApp todavía no está disponible." : "WhatsApp contact is not available yet."}</p>}
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
            {ordered.filter(s => s.type === "service").map(s => (
              <ShopSection key={s.id} section={s} variant="public" labels={sectionLabels} lang={t.lang} />
            ))}
          </ul>
        </div>

        {["about-extra", "testimonial", "gallery", "faq", "booking", "newsletter"].map(type =>
          ordered.filter(section => section.type === type).map(section => (
            <ShopSection key={section.id} section={section} variant="public" labels={sectionLabels} lang={t.lang} />
          ))
        )}

        {ordered.some(section => section.type === "social") && (
          <div className="pv-section">
            <h3>{t("shop.findMeToo")}</h3>
            <ul style={{ paddingLeft: 18 }}>
              {ordered.filter(section => section.type === "social").map(section => (
                <ShopSection key={section.id} section={section} variant="public" labels={sectionLabels} lang={t.lang} />
              ))}
            </ul>
          </div>
        )}

        <div className="pv-section">
          <h3>{t("shop.howToOrder")}</h3>
          <p>{t("shop.howToOrder.body")}</p>
          {waLink ? <a className="pv-cta" href={waLink} target="_blank" rel="noreferrer">{t("shop.messageMe")}</a> : <p>{t.lang === "es" ? "El contacto por WhatsApp todavía no está disponible." : "WhatsApp contact is not available yet."}</p>}
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
