(() => {
  const key = 'aftr-public-events-v1';
  let pending;
  // Only public event information is stored here, never booking/admin records.
  const storage = () => typeof localStorage !== 'undefined' ? localStorage : sessionStorage;
  const read = () => {
    try {
      const saved = JSON.parse(storage().getItem(key));
      if (saved && Number.isFinite(saved.at) && saved.at <= Date.now() && Date.now() - saved.at < 900000 && Array.isArray(saved.events)) return saved.events;
    } catch (_) {}
    return null;
  };
  window.AFTR_PUBLIC_EVENTS = {
    read,
    load() {
      if (!pending) pending = fetch('/api/events', { signal: AbortSignal.timeout(28000) })
        .then(async response => {
          if (!response.ok) throw new Error('Events unavailable');
          const data = await response.json();
          if (!data.ok || !Array.isArray(data.events)) throw new Error('Invalid events');
          // Preserve upstream age: reading a cached response must not make old
          // event information look newly fetched from Google.
          try { storage().setItem(key, JSON.stringify({ at: Number.isFinite(data.fetchedAt) ? data.fetchedAt : Date.now(), events: data.events })); } catch (_) {}
          return data.events;
        }).finally(() => { pending = null; });
      return pending;
    },
    image(value) {
      try {
        const url = new URL(String(value || '').trim());
        if (['drive.google.com', 'drive.usercontent.google.com'].includes(url.hostname)) {
          const id = url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/)?.[1] || url.searchParams.get('id');
          if (id && /^[A-Za-z0-9_-]{10,150}$/.test(id)) return '/api/event-image?id=' + encodeURIComponent(id);
        }
        return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
      } catch (_) { return ''; }
    }
  };
  document.addEventListener('error', event => {
    const img = event.target;
    if (img.tagName !== 'IMG' || !img.closest('.event-card-image, .home-event-image, #eventModal') || img.dataset.fallback) return;
    img.dataset.fallback = 'true';
    img.src = '/assets/event-placeholder.svg';
    img.alt = 'Event photo temporarily unavailable';
  }, true);
})();
