(() => {
  const key = 'aftr-public-events-v1';
  let pending;
  const read = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key));
      if (saved && Date.now() - saved.at < 180000 && Array.isArray(saved.events)) return saved.events;
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
          try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), events: data.events })); } catch (_) {}
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
