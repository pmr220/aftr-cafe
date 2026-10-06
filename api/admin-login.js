const { OAuth2Client } = require('google-auth-library');
const { createHmac } = require('node:crypto');
const client = new OAuth2Client();
const allowedOrigin = require('../lib/allowed-origin');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  // This endpoint uses the GIS JavaScript callback, not Google's redirect POST.
  if (!allowedOrigin(req.headers.origin) || !/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
    return res.status(403).json({ error: 'Request not allowed.' });
  }
  const audience = process.env.AFTR_GOOGLE_CLIENT_ID;
  const emails = (process.env.AFTR_ADMIN_EMAILS ?? process.env.AFTR_ADMIN_EMAIL ?? '')
    .split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  const secret = process.env.AFTR_ADMIN_SIGNING_SECRET;
  if (!audience || !emails.length || !secret || secret.length < 40) {
    return res.status(503).json({ error: 'Admin sign-in is not configured.' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body.credential !== 'string' || body.credential.length > 16000) {
      return res.status(400).json({ error: 'Invalid sign-in request.' });
    }
    const ticket = await client.verifyIdToken({ idToken: body.credential, audience });
    const identity = ticket.getPayload();
    const now = Math.floor(Date.now() / 1000);
    if (!identity || identity.email_verified !== true || !identity.sub ||
        typeof identity.email !== 'string' || !emails.includes(identity.email.toLowerCase()) ||
        !Number.isFinite(identity.exp) || identity.exp <= now) {
      return res.status(403).json({ error: 'This Google account does not have admin access.' });
    }
    const exp = Math.min(now + 900, identity.exp);
    const payload = Buffer.from(JSON.stringify({
      iss: 'aftr-admin', aud: audience, sub: identity.sub,
      email: identity.email.toLowerCase(), iat: now, exp
    })).toString('base64url');
    const signature = createHmac('sha256', secret).update(payload).digest('base64url');
    return res.status(200).json({ token: payload + '.' + signature, expiresAt: exp * 1000 });
  } catch {
    return res.status(401).json({ error: 'Google sign-in could not be verified. Please try again.' });
  }
};
