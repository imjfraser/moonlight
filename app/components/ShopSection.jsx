// Pure shared renderer: usable in server-rendered storefronts or owner previews.
// Labels are plain strings supplied by callers; no browser state or client hooks.
export default function ShopSection({ section, variant = "preview", labels = {}, lang = "en" }) {
  const d = section.data || {};
  const publicView = variant === "public";
  const frame = (children, title = section.title) => publicView
    ? <div className="pv-section"><h3>{title}</h3>{children}</div>
    : children;
  if (section.type === "promo") {
    return publicView
      ? <div style={{ background: "linear-gradient(180deg, #f59a86 0%, #e57a3a 100%)", color: "#fff", padding: "10px 18px", textAlign: "center", fontWeight: 600 }}>
          {d.headline}{d.detail && <div style={{ fontWeight: 400, fontSize: 13, marginTop: 2 }}>{d.detail}</div>}
        </div>
      : <div className="card tight" style={{ background: "rgba(245,154,134,0.15)" }}>
          <strong>{d.headline}</strong><p style={{ margin: "4px 0" }}>{d.detail}</p>
          {d.until && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{d.until}</p>}
        </div>;
  }
  if (section.type === "service") {
    const price = d.priceLocal || (d.priceUSD ? `USD ${d.priceUSD}` : "");
    return publicView
      ? <li><strong>{d.name}</strong> — {d.description}{price && <> · {labels.from} {price}</>}</li>
      : <div className="card tight" style={{ background: "rgba(0,0,0,0.04)" }}>
          <strong>{d.name}</strong><p style={{ margin: "6px 0" }}>{d.description}</p>
          <p className="muted" style={{ margin: 0 }}>{d.priceLocal || `USD ${d.priceUSD}`} · {d.deliveryWindow}</p>
        </div>;
  }
  if (section.type === "about-extra") {
    return publicView ? frame(<p>{d.body}</p>, d.heading || section.title)
      : <div className="card tight" style={{ background: "rgba(0,0,0,0.04)" }}>
          <strong>{d.heading}</strong><p style={{ margin: "6px 0 0" }}>{d.body}</p>
        </div>;
  }
  if (section.type === "testimonial") {
    const quote = <><p style={{ fontStyle: "italic", ...(publicView ? {} : { margin: 0 }) }}>&ldquo;{d.quote}&rdquo;</p>
      <p className={publicView ? undefined : "muted"} style={publicView ? { color: "#666", margin: 0 } : { margin: "6px 0 0" }}>— {d.author}</p></>;
    return frame(publicView
      ? <blockquote style={{ margin: 0, paddingLeft: 12, borderLeft: "3px solid #f5a623" }}>{quote}</blockquote>
      : <div className="card tight" style={{ background: "rgba(0,0,0,0.04)" }}>{quote}</div>);
  }
  if (section.type === "faq") {
    const items = (d.items || []).map((item, i) => publicView
      ? <div key={i} style={{ marginBottom: 10 }}><strong>{item.q}</strong><p style={{ margin: "4px 0" }}>{item.a}</p></div>
      : <li key={i}><strong>{item.q}</strong><br /><span className="muted">{item.a}</span></li>);
    return frame(publicView ? items : <ul className="clean">{items}</ul>);
  }
  if (section.type === "gallery") {
    const allPhotos = d.photos || (d.captions || []).map(caption => ({ url: "", caption }));
    const photos = publicView ? allPhotos.filter(photo => photo.url) : allPhotos;
    if (publicView && !photos.length) return frame(<p style={{ fontSize: 13, color: "#999" }}>{labels.photosUnavailable}</p>);
    return frame(<div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${publicView ? 140 : 120}px, 1fr))`, gap: 8 }}>
      {photos.map((photo, i) => {
        const image = photo.url
          ? <img src={photo.url} alt={photo.caption || ""} style={{ width: "100%", borderRadius: publicView ? 10 : 6, display: "block", ...(publicView ? { border: "1px solid #eee" } : {}) }} />
          : <div style={{ height: 80, borderRadius: 6, background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 12, textAlign: "center", padding: 6 }}>{photo.caption || ""}</div>;
        return publicView
          ? <figure key={i} style={{ margin: 0 }}>{image}{photo.caption && <figcaption style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{photo.caption}</figcaption>}</figure>
          : <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 6, background: "rgba(255,255,255,0.6)" }}>
              {image}{photo.url && photo.caption && <p className="muted" style={{ fontSize: 11, margin: "4px 0 0" }}>{photo.caption}</p>}
            </div>;
      })}
    </div>);
  }
  if (section.type === "booking") {
    return frame(publicView
      ? (d.url ? <a className="pv-cta" href={d.url} target="_blank" rel="noreferrer">{d.label || (lang === "es" ? "Reservar una cita" : "Book a time")}</a>
        : <p style={{ color: "#999" }}>{labels.bookingUnavailable}</p>)
      : <p><strong>{d.label}</strong>{d.url ? <> — <a href={d.url}>{d.url}</a></> : null}</p>);
  }
  if (section.type === "newsletter") {
    return frame(publicView
      ? <><p>{d.prompt}</p><p style={{ color: "#999", fontSize: 13 }}>{labels.emailUnavailable}</p></>
      : <p className="muted"><strong>{d.label}</strong> — {d.prompt}</p>);
  }
  if (section.type === "social") {
    const links = (d.links || []).map((link, i) => <li key={i}><strong>{link.platform}:</strong>{" "}
      {publicView ? (link.url ? <a href={link.url}>{link.url}</a> : <span style={{ color: "#999" }}>{labels.socialUnavailable}</span>) : link.url || ""}
    </li>);
    // Public caller groups social sections in one existing list.
    return publicView ? <>{links}</> : <ul className="clean">{links}</ul>;
  }
  return publicView ? null : <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(d, null, 2)}</pre>;
}
