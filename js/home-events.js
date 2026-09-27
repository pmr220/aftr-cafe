(() => {
  const grid = document.querySelector('#homeEventsGrid');
  if (!grid) return;

  const empty = document.querySelector('#homeEventsEmpty');
  const API = window.AFTR_API_URL || '';

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));

  const fmtDate = (dateValue) => {
    const value = String(dateValue || '').trim();
    const date = new Date(value + 'T12:00:00');

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const isPublished = (event) => {
    const status = String(event?.status || '').trim().toLowerCase();
    return status === 'published' || status === 'approved';
  };

  const normalizeEvents = (list) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return list
      .filter((event) => isPublished(event) && event.date)
      .map((event) => ({
        ...event,
        date: String(event.date).slice(0, 10)
      }))
      .filter((event) => {
        const date = new Date(event.date + 'T23:59:59');
        return !Number.isNaN(date.getTime()) && date >= today;
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return String(a.startTime || '')
          .localeCompare(String(b.startTime || ''));
      })
      .slice(0, 4);
  };

  /*
   * Convert Google Drive URLs into browser-friendly
   * thumbnail URLs.
   */
  const normalizeImageUrl = window.AFTR_PUBLIC_EVENTS.image;

  const getImage = (event) => {
    const raw = String(
      event?.imageUrls ||
      event?.image ||
      ''
    );

    return raw
      .split('|')
      .map((item) => item.trim())
      .map(normalizeImageUrl)
      .find(Boolean) || '';
  };

  const eventCard = (event) => {
    const image = getImage(event);

    return `
      <article class="home-event-card reveal">

        <div class="home-event-image">

          ${
            image
              ? `
                <img
                  src="${esc(image)}"
                  alt="${esc(event.title || 'AFTR event')}"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                >
              `
              : ''
          }

          <span class="home-event-date">
            ${esc(fmtDate(event.date))}
          </span>

        </div>

        <div class="home-event-main">

          <div class="home-event-copy">

            <span class="eyebrow">
              ${esc(event.category || 'Upcoming event')}
            </span>

            <h3>
              ${esc(event.title || 'AFTR Event')}
            </h3>

            <p>
              ${esc(
                event.about ||
                'Join us at AFTR for this upcoming event.'
              )}
            </p>

          </div>

          <div class="home-event-meta">

            <span>
              ${esc(
                event.time ||
                event.timeDisplay ||
                ''
              )}
            </span>

            <span>
              ${esc(
                event.price ||
                'Price on enquiry'
              )}
            </span>

            <a
              href="events.html"
              class="home-event-link"
            >
              View & book ↗
            </a>

          </div>

        </div>

      </article>
    `;
  };

  const scrollNext = () => {
    if (!grid.children.length) return;

    if (
      grid.scrollWidth <=
      grid.clientWidth + 8
    ) {
      return;
    }

    const firstCard =
      grid.children[0];

    const cardWidth =
      firstCard.getBoundingClientRect().width;

    const styles =
      getComputedStyle(grid);

    const gap =
      parseFloat(
        styles.columnGap ||
        styles.gap ||
        '0'
      ) || 0;

    const step =
      cardWidth + gap;

    const maxScroll =
      grid.scrollWidth -
      grid.clientWidth;

    if (
      grid.scrollLeft >=
      maxScroll - 8
    ) {
      grid.scrollTo({
        left: 0,
        behavior: 'smooth'
      });
    } else {
      grid.scrollBy({
        left: step,
        behavior: 'smooth'
      });
    }
  };

  const source = window.AFTR_PUBLIC_EVENTS;
  const status = document.createElement('p');
  status.className = 'events-load-status';
  status.setAttribute('role', 'status');
  grid.before(status);
  let hasData = false;
  let lastData = '';
  let loading = false;
  const apply = list => {
    const signature = JSON.stringify(list) + new Date().toDateString();
    if (signature === lastData) return;
    lastData = signature;
    hasData = true;
    const events = normalizeEvents(list);
    empty.hidden = events.length > 0;
    const previousScroll = grid.scrollLeft;
    grid.innerHTML = events.map(eventCard).join('');
    grid.scrollLeft = previousScroll;
    grid.querySelectorAll('.reveal').forEach(element => element.classList.add('in'));
  };
  const cached = source.read();
  if (cached) apply(cached);
  const load = async () => {
    if (loading || document.hidden) return;
    loading = true;
    status.textContent = hasData ? '' : 'Loading upcoming events…';
    grid.setAttribute('aria-busy', 'true');
    try {
      apply(await source.load());
      status.textContent = '';
    } catch (_) {
      if (!hasData) empty.hidden = true;
      status.textContent = hasData
        ? 'Showing recently loaded events. Updates are temporarily unavailable.'
        : 'Events are taking longer to load. Retrying shortly…';
    } finally {
      loading = false;
      grid.setAttribute('aria-busy', 'false');
    }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });

  let hoverPaused = false;
  let touchPaused = false;

  grid.addEventListener(
    'mouseenter',
    () => {
      hoverPaused = true;
    }
  );

  grid.addEventListener(
    'mouseleave',
    () => {
      hoverPaused = false;
    }
  );

  grid.addEventListener(
    'touchstart',
    () => {
      touchPaused = true;
    },
    {
      passive: true
    }
  );

  grid.addEventListener(
    'touchend',
    () => {
      window.setTimeout(() => {
        touchPaused = false;
      }, 2500);
    },
    {
      passive: true
    }
  );

  window.setInterval(() => {
    if (
      !hoverPaused &&
      !touchPaused
    ) {
      scrollNext();
    }
  }, 4500);

  load();

  window.setInterval(
    load,
    60000
  );
})();