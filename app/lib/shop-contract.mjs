// Validated owner records and an explicit, separate public projection.
export const SHOP_BODY_LIMIT = 8 * 1024 * 1024;
export class ShopValidationError extends Error {
  constructor() { super("invalid_shop"); this.status = 400; }
}
const bad = () => { throw new ShopValidationError(); };
function object(v, keys, strict) {
  if (!v || typeof v !== "object" || Array.isArray(v)) bad();
  if (strict && Object.keys(v).some(k => !keys.includes(k))) bad();
  return v;
}
function str(v, max = 4000) {
  if (typeof v !== "string" || v.length > max) bad();
  return v;
}
function list(v, max, fn) {
  if (!Array.isArray(v) || v.length > max) bad();
  return v.map(fn);
}
export function normalizeHandle(value) {
  const h = str(value, 80).trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(h)) bad();
  return h;
}
function fields(v, names, strict, extra = {}) {
  object(v, [...names, ...Object.keys(extra)], strict);
  const out = {};
  for (const key of names) if (v[key] !== undefined) out[key] = str(v[key]);
  for (const [key, fn] of Object.entries(extra)) if (v[key] !== undefined) out[key] = fn(v[key]);
  return out;
}
function price(v) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1e9) bad();
  return v;
}
export function safeWebUrl(value) {
  const v = str(value, 4096);
  if (!v) return v;
  let url;
  try { url = new URL(v); } catch { bad(); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) bad();
  return v;
}
function photoUrl(value) {
  if (typeof value !== "string") bad();
  if (!value.startsWith("data:")) return safeWebUrl(value);
  const match = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/]*={0,2})$/.exec(value);
  if (!match || match[1].length % 4 !== 0 || Buffer.byteLength(match[1], "base64") > 2 * 1024 * 1024) bad();
  return value;
}
export function normalizeSection(value, { strict = true } = {}) {
  object(value, ["id", "type", "title", "data"], strict);
  const type = str(value.type, 40);
  const d = value.data;
  let data;
  const textFields = {
    service: ["name", "description", "priceLocal", "deliveryWindow"],
    testimonial: ["quote", "author"],
    promo: ["headline", "detail", "until"],
    "about-extra": ["heading", "body"],
    newsletter: ["label", "prompt"],
  };
  if (Object.hasOwn(textFields, type)) {
    data = fields(d, textFields[type], strict, type === "service" ? { priceUSD: price } : {});
  } else if (type === "booking") {
    data = fields(d, ["label"], strict, { url: safeWebUrl });
  } else if (type === "faq") {
    data = fields(d, [], strict, { items: v => list(v, 50, x => fields(x, ["q", "a"], strict)) });
    data.items ??= [];
  } else if (type === "social") {
    data = fields(d, [], strict, { links: v => list(v, 30, x => fields(x, ["platform"], strict, { url: safeWebUrl })) });
    data.links ??= [];
  } else if (type === "gallery") {
    data = fields(d, ["title"], strict, {
      photos: v => list(v, 30, x => fields(x, ["caption"], strict, { url: photoUrl })),
      captions: v => list(v, 30, x => str(x)),
    });
    if (!data.photos) data.photos = (data.captions || []).map(caption => ({ url: "", caption }));
    delete data.captions;
  } else bad();
  const out = { type, title: str(value.title ?? "", 300), data };
  if (value.id !== undefined) out.id = str(value.id, 150);
  return out;
}
export function normalizeShop(value, handle, { strict = true } = {}) {
  const keys = ["handle", "ownerPublicName", "ownerRealName", "showRealName", "offer", "contact", "savedAt", "updatedAt", "sections"];
  object(value, keys, strict);
  handle = normalizeHandle(handle ?? value.handle);
  if (value.handle !== undefined && normalizeHandle(value.handle) !== handle) bad();
  if (value.showRealName !== undefined && typeof value.showRealName !== "boolean") bad();
  const out = {
    handle,
    ownerPublicName: str(value.ownerPublicName ?? "", 300),
    ownerRealName: str(value.ownerRealName ?? "", 300),
    showRealName: value.showRealName === true,
    offer: fields(value.offer ?? {}, ["name", "tagline", "description", "priceLocal", "deliveryWindow", "firstCustomer", "scalingPath"], strict, { priceUSD: price }),
    sections: list(value.sections ?? [], 100, s => normalizeSection(s, { strict })),
  };
  if (value.contact !== undefined) out.contact = fields(value.contact, [], strict, {
    channels: v => list(v, 30, x => str(x, 100)),
    whatsapp: v => {
      const n = str(v, 16);
      if (n && !/^[1-9][0-9]{6,14}$/.test(n)) bad();
      return n;
    },
  });
  for (const k of ["savedAt", "updatedAt"]) if (value[k] !== undefined) {
    const date = str(value[k], 50);
    if (!Number.isFinite(Date.parse(date))) bad();
    out[k] = date;
  }
  if (Buffer.byteLength(JSON.stringify(out)) > SHOP_BODY_LIMIT) bad();
  return out;
}
export function publicShop(value, handle) {
  // Ignore unknown legacy properties, but validate all supported shapes.
  const shop = normalizeShop(value, handle, { strict: false });
  const offer = {};
  for (const k of ["name", "tagline", "description", "priceUSD", "priceLocal", "deliveryWindow"]) {
    if (shop.offer[k] !== undefined) offer[k] = shop.offer[k];
  }
  const out = { handle: shop.handle, ownerPublicName: shop.ownerPublicName, showRealName: shop.showRealName, offer, sections: shop.sections };
  if (shop.showRealName) out.ownerRealName = shop.ownerRealName;
  if (shop.contact?.whatsapp) out.contact = { whatsapp: shop.contact.whatsapp };
  return out;
}
