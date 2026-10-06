const API = 'https://script.google.com/macros/s/AKfycbxHzrM50fNB43-rNfz-jT8g8Po3a4Vgw0TBulplRuX_cZr14FweZd2jEQ0UGUWOGF4X/exec';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  try {
    // Only the existing PUBLIC menu action can be requested through this cache.
    const response = await fetch(API + '?action=menu', { signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error('Upstream unavailable');
    const data = await response.json();
    if (data.ok !== true || !Array.isArray(data.menus)) throw new Error('Invalid feed');
    res.setHeader('Cache-Control', 'public, max-age=15');
    // Keep a successful response through quiet periods. Refresh in the background
    // after one minute instead of making the next visitor wait for Apps Script.
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ ok: true, menus: data.menus, fetchedAt: Date.now() });
  } catch {
    return res.status(502).json({ ok: false, error: 'Menus are temporarily unavailable. Please try again.' });
  }
};

