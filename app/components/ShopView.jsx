import Link from "next/link";
import { messages } from "../lib/messages";
import ShopSection from "./ShopSection";

// No client cache or private owner state: accepts only the public projection.
export default function ShopView({ shop, lang = "en" }) {
  const t = (key, vars = {}) => {
    const text = messages[key]?.[lang] ?? messages[key]?.en ?? key;
    return text.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(vars, name) ? String(vars[name]) : match);
  };
  const labels = {
    from: t("shop.from"), photosUnavailable: t("shop.photosComingSoon"),
    bookingUnavailable: t("shop.bookingComing"), emailUnavailable: t("shop.emailComing"),
    socialUnavailable: t("shop.socialComing"),
  };
  const displayName = shop.showRealName ? (shop.ownerRealName || shop.ownerPublicName) : shop.ownerPublicName;
  const offer = shop.offer;
  const sections = shop.sections;
  const promo = sections.find(s => s.type === "promo");
  const number = shop.contact?.whatsapp;
  const contactText = lang === "es"
    ? `¡Hola! Vi tu página de ${offer.name || "negocio"}. ¿Me cuentas más?`
    : `Hi! I saw your ${offer.name || "page"}. Could you tell me more?`;
  const waLink = number && /^[1-9][0-9]{6,14}$/.test(number)
    ? `https://wa.me/${number}?text=${encodeURIComponent(contactText)}` : null;
  const contact = (label) => waLink
    ? <a className="pv-cta" href={waLink} target="_blank" rel="noreferrer">{label}</a>
    : <p>{lang === "es" ? "El contacto por WhatsApp todavía no está disponible." : "WhatsApp contact is not available yet."}</p>;
  const render = (section, index) => <ShopSection key={section.id || `${section.type}-${index}`} section={section} variant="public" labels={labels} lang={lang} />;

  return <main lang={lang}>
    <div className="preview-frame" style={{ maxWidth: 520, margin: "0 auto" }}>
      {promo && render(promo, 0)}
      <div className="pv-hero">
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: "#7a5826" }}>{offer.tagline || ""}</span>
        <h1 style={{ fontSize: 28 }}>{offer.name || displayName}</h1>
        <p>{offer.description}</p>
        {contact(t("shop.messageWA"))}
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
          {(offer.priceLocal || offer.priceUSD) && <li>{t("shop.from")} {offer.priceLocal || `USD ${offer.priceUSD}`}</li>}
          {sections.filter(s => s.type === "service").map(render)}
        </ul>
      </div>
      {["about-extra", "testimonial", "gallery", "faq", "booking", "newsletter"].flatMap(type => sections.filter(s => s.type === type).map(render))}
      {sections.some(s => s.type === "social") && <div className="pv-section">
        <h3>{t("shop.findMeToo")}</h3>
        <ul style={{ paddingLeft: 18 }}>{sections.filter(s => s.type === "social").map(render)}</ul>
      </div>}
      <div className="pv-section">
        <h3>{t("shop.howToOrder")}</h3>
        <p>{t("shop.howToOrder.body")}</p>
        {contact(t("shop.messageMe"))}
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
  </main>;
}
