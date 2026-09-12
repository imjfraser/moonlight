// Read incrementally: Content-Length alone cannot bound chunked requests.
export async function readRequestJson(req, maxBytes) {
  const fail = (code, status) => Object.assign(new Error(code), { status });
  const length = Number(req.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) throw fail("payload_too_large", 413);
  if (!req.body) throw fail("invalid_json", 400);
  const reader = req.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw fail("payload_too_large", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw fail("invalid_json", 400); }
}
