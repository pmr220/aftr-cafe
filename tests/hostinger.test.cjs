const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');
const allowedOrigin = require('../lib/allowed-origin');

test('Hostinger serves public pages and video ranges, protects private files and routes APIs', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const page of ['/', '/admin.html', '/book.html', '/reserve.html', '/partner.html', '/js/config.js']) {
      const res = await fetch(base + page);
      assert.equal(res.status, 200, page);
      assert.equal(res.headers.get('x-frame-options'), 'DENY');
      assert.equal(res.headers.get('x-powered-by'), null);
      await res.arrayBuffer();
    }
    for (const file of ['/backend/google-apps-script/Code.gs', '/.env', '/.git/config', '/package.json', '/server.js', '/tests/admin-auth.test.cjs', '/AFTR-backend-current.txt']) {
      assert.equal((await fetch(base + file)).status, 404, file);
    }
    const video = await fetch(base + '/assets/aftr-hero.mp4', { headers: { Range: 'bytes=0-99' } });
    assert.equal(video.status, 206);
    assert.equal((await video.arrayBuffer()).byteLength, 100);
    assert.equal((await fetch(base + '/api/admin-login')).status, 405);
    for (const origin of ['https://aftrcafe.in', 'https://www.aftrcafe.in', 'https://aftr-cafe-parth.vercel.app']) {
      const res = await fetch(base + '/api/admin-read', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'admin_requests', adminToken: 'bad' }) });
      assert.equal(res.status, 401);
    }
    assert.equal((await fetch(base + '/api/admin-read', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    assert.equal((await fetch(base + '/api/admin-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' })).status, 400);
    assert.equal((await fetch(base + '/api/admin-read', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'a'.repeat(40000) })).status, 413);
    assert.equal((await fetch(base + '/api/event-image?id=bad')).status, 400);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('Origin allowlist supports explicit preview origins without wildcard access', () => {
  const previous = process.env.AFTR_ALLOWED_ORIGINS;
  try {
    process.env.AFTR_ALLOWED_ORIGINS = 'https://preview.hostingersite.com,https://aftrcafe.in';
    assert.equal(allowedOrigin('https://preview.hostingersite.com'), true);
    for (const origin of [undefined, 'null', 'https://evil.hostingersite.com', 'https://aftrcafe.in.evil.com']) assert.equal(allowedOrigin(origin), false);
  } finally {
    if (previous === undefined) delete process.env.AFTR_ALLOWED_ORIGINS;
    else process.env.AFTR_ALLOWED_ORIGINS = previous;
  }
});
