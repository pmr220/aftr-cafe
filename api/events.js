const API = 'https://script.google.com/macros/s/AKfycbxHzrM50fNB43-rNfz-jT8g8Po3a4Vgw0TBulplRuX_cZr14FweZd2jEQ0UGUWOGF4X/exec';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  try {
    // Only the existing PUBLIC events action can be requested through this cache.
    const response = await fetch(API + '?action=events', { signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error('Upstream unavailable');
    const data = await response.json();
    if (data.ok !== true || !Array.isArray(data.events)) throw new Error('Invalid feed');
    res.setHeader('Cache-Control', 'public, max-age=15');
    // Keep a successful response through quiet periods. Refresh in the background
    // after one minute instead of making the next visitor wait for Apps Script.
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=3600');
    return res.status(200).json({ ok: true, events: data.events, fetchedAt: Date.now() });
  } catch {
    return res.status(502).json({ ok: false, error: 'Events are temporarily unavailable. Please try again.' });
  }
};
