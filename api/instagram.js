const API = 'https://script.google.com/macros/s/AKfycbzqEXZAiI0O9ymi6IkMeQucPNwzN4m23CdPYpVX5MUnzl-RpARoDjnlTwnutBfmVROx/exec';
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  try {
    const response = await fetch(API + '?action=instagram_posts', { signal: AbortSignal.timeout(25000) });
    const data = await response.json();
    if (!response.ok || data.ok !== true || !Array.isArray(data.posts)) throw Error();
    // Short public cache; admin preview bypasses this cache.
    res.setHeader('Cache-Control', 'public, max-age=15');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=30');
    return res.status(200).json({ ok: true, posts: data.posts.map(({ id, url, caption, imageId }) => ({ id, url, caption, imageId })) });
  } catch { return res.status(502).json({ ok: false, error: 'Posts are temporarily unavailable.' }); }
};
