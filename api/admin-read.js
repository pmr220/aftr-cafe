const { createHmac, timingSafeEqual } = require('node:crypto');
const allowedOrigin = require('../lib/allowed-origin');
const API = 'https://script.google.com/macros/s/AKfycbxHzrM50fNB43-rNfz-jT8g8Po3a4Vgw0TBulplRuX_cZr14FweZd2jEQ0UGUWOGF4X/exec';
const READS = new Set(['admin_requests', 'admin_events', 'admin_availability', 'menu', 'admin_request_status']);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!allowedOrigin(req.headers.origin)) return res.status(403).json({ ok: false });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch {}
  if (!body || !READS.has(body.action)) return res.status(400).json({ ok: false });
  try {
    const secret = process.env.AFTR_ADMIN_SIGNING_SECRET;
    const audience = process.env.AFTR_GOOGLE_CLIENT_ID;
    const emails = (process.env.AFTR_ADMIN_EMAILS ?? process.env.AFTR_ADMIN_EMAIL ?? '')
      .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    if (!secret || secret.length < 40 || !audience || !emails.length) throw Error();
    if (typeof body.adminToken !== 'string' || body.adminToken.length > 4096) throw Error();
    const parts = body.adminToken.split('.');
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) throw Error();
    const expected = createHmac('sha256', secret).update(parts[0]).digest('base64url');
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(parts[1]))) throw Error();
    const claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== 'aftr-admin' || claims.aud !== audience || !emails.includes(claims.email) ||
        typeof claims.sub !== 'string' || !claims.sub || !Number.isFinite(claims.iat) ||
        !Number.isFinite(claims.exp) || claims.iat > now + 30 || claims.exp <= now ||
        claims.exp <= claims.iat || claims.exp - claims.iat > 900) throw Error();
  } catch {
    return res.status(401).json({ ok: false, code: 'UNAUTHORIZED', error: 'Please sign in again.' });
  }
  // Only reads may be retried. Never replay uploads or approval actions.
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    let failure = 'network';
    let upstreamStatus = null;
    try {
      const response = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: body.action, adminToken: body.adminToken,
          ...(body.action === 'admin_request_status' ? { id: String(body.id || '').slice(0,100) } : {}) }),
        signal: AbortSignal.timeout(25000)
      });
      upstreamStatus = response.status;
      failure = 'http';
      if (!response.ok) throw Error();
      failure = 'invalid_json';
      const data = await response.json();
      failure = 'invalid_shape';
      if (!data || typeof data.ok !== 'boolean') throw Error();
      return res.status(200).json(data);
    } catch (error) {
      console.warn('admin_read_failed', JSON.stringify({ action: body.action, attempt: attempt + 1,
        reason: error.name === 'TimeoutError' || error.name === 'AbortError' ? 'timeout' : failure,
        upstreamStatus, elapsedMs: Date.now() - started }));
    }
  }
  return res.status(502).json({ ok: false, error: 'Google backend is temporarily unavailable. Please try again shortly.' });
};
