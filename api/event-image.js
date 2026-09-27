module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).end();
  const id = req.query?.id;
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{10,150}$/.test(id)) return res.status(400).end();
  try {
    // Fixed Google endpoint; never accept a user-supplied upstream URL or cookies.
    const response = await fetch('https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1200', {
      signal: AbortSignal.timeout(15000)
    });
    const type = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type)) throw new Error('Not an image');
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4 * 1024 * 1024) { await reader.cancel(); throw new Error('Image too large'); }
      chunks.push(Buffer.from(value));
    }
    res.setHeader('Content-Type', type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).send(Buffer.concat(chunks));
  } catch {
    return res.status(502).end();
  }
};
