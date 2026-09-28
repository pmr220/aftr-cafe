const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { OAuth2Client } = require('google-auth-library');
const handler = require('../api/admin-login');
const secret = crypto.randomBytes(32).toString('base64');
const audience = 'test.apps.googleusercontent.com';
const email = 'admin@gmail.com';
delete process.env.AFTR_ADMIN_EMAILS;
Object.assign(process.env, { AFTR_ADMIN_SIGNING_SECRET: secret, AFTR_GOOGLE_CLIENT_ID: audience, AFTR_ADMIN_EMAIL: email });
const properties = { AFTR_ADMIN_SIGNING_SECRET: secret, AFTR_GOOGLE_CLIENT_ID: audience, AFTR_ADMIN_EMAIL: email };
const ctx = vm.createContext({
  console, PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key] }) },
  Utilities: {
    computeHmacSha256Signature: (text, key) => crypto.createHmac('sha256', key).update(text).digest(),
    base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url'),
    base64DecodeWebSafe: text => Buffer.from(text, 'base64url'),
    newBlob: bytes => ({ getDataAsString: () => Buffer.from(bytes).toString() })
  }
});
vm.runInContext(fs.readFileSync('backend/google-apps-script/Code.gs', 'utf8'), ctx);
ctx.json_ = value => value;
const now = () => Math.floor(Date.now() / 1000);
function capability(overrides = {}) {
  const payload = Buffer.from(JSON.stringify({ iss: 'aftr-admin', aud: audience, sub: '123', email, iat: now(), exp: now() + 900, ...overrides })).toString('base64url');
  return payload + '.' + crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}
test('Apps Script validates signatures, identity, lifetime and configuration', () => {
  assert.equal(ctx.verifyAdminToken_(capability()), true);
  for (const value of [undefined, '', 'bad', capability() + 'x', capability({ email: 'other@gmail.com' }), capability({ aud: 'wrong' }), capability({ exp: now() - 1 }), capability({ exp: now() + 3600 }), capability({ iat: now() + 60 }), capability({ sub: '' })]) {
    assert.equal(ctx.verifyAdminToken_(value), false);
  }
  properties.AFTR_ADMIN_SIGNING_SECRET = '';
  assert.equal(ctx.verifyAdminToken_(capability()), false);
  properties.AFTR_ADMIN_SIGNING_SECRET = secret;
});
test('Every private action rejects unauthenticated POST, and private GET is blocked', () => {
  for (const action of ['admin_requests', 'admin_events', 'admin_availability', 'update_request', 'approve_request', 'reject_request', 'save_event', 'unpublish_event', 'block_slot', 'save_menu_pdf', 'delete_menu_pdf', 'menu', 'unknown']) {
    assert.equal(ctx.doPost({ postData: { contents: JSON.stringify({ action }) } }).code, 'UNAUTHORIZED');
  }
  for (const action of ['admin_requests', 'admin_events']) assert.equal(ctx.doGet({ parameter: { action } }).code, 'UNAUTHORIZED');
});
test('Public submissions remain accessible; public availability removes customer details', () => {
  ctx.submitEvent_ = ctx.submitTable_ = ctx.submitCollaboration_ = () => ({ ok: true });
  for (const action of ['submit_event', 'booking', 'collaboration']) assert.equal(ctx.doPost({ postData: { contents: JSON.stringify({ action }) } }).ok, true);
  ctx.readObjects_ = () => [{ status: 'active' }];
  ctx.calendarBlock_ = () => ({ date: '2026-10-01', start: '10:00', end: '11:00', status: 'active', note: 'Private customer', requestId: 'private', id: 'private' });
  const publicResult = ctx.doGet({ parameter: { action: 'availability' } });
  assert.equal(publicResult.blocks[0].note, 'Unavailable');
  assert.equal(publicResult.blocks[0].requestId, undefined);
  const admin = ctx.doPost({ postData: { contents: JSON.stringify({ action: 'admin_availability', adminToken: capability() }) } });
  assert.equal(admin.blocks[0].note, 'Private customer');
});
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
OAuth2Client.prototype.getFederatedSignonCertsAsync = async () => ({ certs: { fixture: publicKey.export({ type: 'spki', format: 'pem' }) }, format: 'PEM' });
function googleToken(overrides = {}, signingKey = privateKey) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'fixture' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: audience, sub: '123', email, email_verified: true, iat: now(), exp: now() + 3600, ...overrides })).toString('base64url');
  return header + '.' + body + '.' + crypto.sign('RSA-SHA256', Buffer.from(header + '.' + body), signingKey).toString('base64url');
}
async function request(credential, overrides = {}) {
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method: 'POST', headers: { origin: 'https://aftr-cafe-parth.vercel.app', 'content-type': 'application/json' }, body: { credential }, ...overrides }, res);
  return res;
}
test('Real Google library verifies signed fixture; server token is accepted by Apps Script', async () => {
  const res = await request(googleToken());
  assert.equal(res.code, 200);
  assert.equal(ctx.verifyAdminToken_(res.body.token), true);
});

test('Both services enforce the same multiple-admin list and revoke removed accounts', async () => {
  const allowed = ['parthrathi7@gmail.com', 'aftrcafe@gmail.com', 'aabhish49@gmail.com'];
  process.env.AFTR_ADMIN_EMAILS = properties.AFTR_ADMIN_EMAILS = ' ' + allowed.join(', ').toUpperCase() + ', ';
  try {
    for (const admin of allowed) {
      const res = await request(googleToken({ email: admin }));
      assert.equal(res.code, 200);
      assert.equal(ctx.verifyAdminToken_(res.body.token), true);
    }
    for (const outsider of [email, 'other@gmail.com', 'xaftrcafe@gmail.com']) {
      assert.equal((await request(googleToken({ email: outsider }))).code, 403);
      assert.equal(ctx.verifyAdminToken_(capability({ email: outsider })), false);
    }
    const oldToken = (await request(googleToken({ email: allowed[0] }))).body.token;
    process.env.AFTR_ADMIN_EMAILS = properties.AFTR_ADMIN_EMAILS = allowed[1];
    assert.equal(ctx.verifyAdminToken_(oldToken), false);
    assert.equal((await request(googleToken({ email: allowed[0] }))).code, 403);
    process.env.AFTR_ADMIN_EMAILS = properties.AFTR_ADMIN_EMAILS = ' , ';
    assert.equal((await request(googleToken())).code, 503);
    assert.equal(ctx.verifyAdminToken_(capability()), false);
  } finally {
    delete process.env.AFTR_ADMIN_EMAILS;
    delete properties.AFTR_ADMIN_EMAILS;
  }
  assert.equal((await request(googleToken())).code, 200);
  assert.equal(ctx.verifyAdminToken_(capability()), true);
});
test('Server rejects wrong origin, method, Google identity, issuer, audience and signature', async () => {
  assert.equal((await request(googleToken(), { headers: { origin: 'https://evil.example', 'content-type': 'application/json' } })).code, 403);
  assert.equal((await request(googleToken(), { method: 'GET' })).code, 405);
  for (const changes of [{ email: 'other@gmail.com' }, { email_verified: false }, { aud: 'wrong' }, { iss: 'evil' }, { exp: now() - 1000 }]) assert.notEqual((await request(googleToken(changes))).code, 200);
  const otherKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  assert.equal((await request(googleToken({}, otherKey))).code, 401);
});

test('Admin browser initializes without fetching private data and clears the session on sign-out', async () => {
  const elements = new Map();
  function element(selector) {
    if (!elements.has(selector)) elements.set(selector, {
      hidden: selector === '#dashboard', textContent: '', innerHTML: '', value: '',
      classList: { add() {}, remove() {} }, setAttribute() {},
      listeners: {}, addEventListener(name, callback) { this.listeners[name] = callback; },
      querySelectorAll: () => []
    });
    return elements.get(selector);
  }
  let config;
  let calls = 0;
  const google = { accounts: { id: { initialize(value) { config = value; }, renderButton() {}, disableAutoSelect() {} } } };
  const browser = vm.createContext({
    console, google, setTimeout: () => 1, clearTimeout() {},
    window: { google, AFTR_API_URL: 'https://example.com/backend', AFTR_GOOGLE_CLIENT_ID: audience },
    document: { querySelector: element, querySelectorAll: () => [] },
    fetch: async (url, options) => {
      calls++;
      if (url === '/api/admin-login') return { ok: true, json: async () => ({ token: 'session', expiresAt: Date.now() + 900000 }) };
      assert.equal(JSON.parse(options.body).adminToken, 'session');
      assert.equal(options.method, 'POST');
      return { json: async () => ({ ok: true, requests: [], events: [], blocks: [], menus: [] }) };
    }
  });
  vm.runInContext(fs.readFileSync('js/admin.js', 'utf8'), browser);
  assert.equal(calls, 0);
  browser.window.aftrInitGoogleLogin();
  await config.callback({ credential: 'fixture' });
  assert.equal(calls, 5);
  assert.equal(element('#dashboard').hidden, false);
  element('#adminSignOut').listeners.click();
  assert.equal(element('#dashboard').hidden, true);
  assert.equal(element('#adminLogin').hidden, false);
});
