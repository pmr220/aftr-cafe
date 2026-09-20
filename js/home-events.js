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
  const normalizeImageUrl = (value) => {
    const url = String(value || '').trim();

    if (!url) return '';

    /*
     * Base64 image
     */
    if (url.startsWith('data:image/')) {
      return url;
    }

    /*
     * Google Drive:
     * https://drive.google.com/file/d/FILE_ID/view
     */
    let match = url.match(
      /drive\.google\.com\/file\/d\/([^/]+)/i
    );

    if (match) {
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(match[1])}&sz=w1600`;
    }

    /*
     * Google Drive:
     * https://drive.google.com/uc?export=view&id=FILE_ID
     * https://drive.google.com/uc?id=FILE_ID
     */
    if (
      /drive\.google\.com\/uc/i.test(url)
    ) {
      match = url.match(/[?&]id=([^&]+)/i);

      if (match) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(match[1])}&sz=w1600`;
      }
    }

    /*
     * Google Drive:
     * /open?id=FILE_ID
     */
    if (
      /drive\.google\.com\/open/i.test(url)
    ) {
      match = url.match(/[?&]id=([^&]+)/i);

      if (match) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(match[1])}&sz=w1600`;
      }
    }

    /*
     * Google Drive thumbnail URL already supplied.
     * Keep it, but make sure a useful size is present.
     */
    if (
      /drive\.google\.com\/thumbnail/i.test(url)
    ) {
      match = url.match(/[?&]id=([^&]+)/i);

      if (match) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(match[1])}&sz=w1600`;
      }
    }

    /*
     * Google user-content download URL
     */
    if (
      /drive\.usercontent\.google\.com/i.test(url)
    ) {
      match = url.match(/[?&]id=([^&]+)/i);

      if (match) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(match[1])}&sz=w1600`;
      }
    }

    /*
     * Any normal image URL
     */
    return url;
  };

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

  const load = async () => {
    let events = [];

    if (API) {
      try {
        const response = await fetch(
          API + '?action=events',
          {
            cache: 'no-store'
          }
        );

        if (!response.ok) {
          throw new Error(
            'Events request failed'
          );
        }

        const data =
          await response.json();

        events =
          Array.isArray(data.events)
            ? data.events
            : [];

      } catch (error) {
        console.error(
          'AFTR home events error:',
          error
        );
      }
    }

    events =
      normalizeEvents(events);

    empty.hidden =
      events.length > 0;

    grid.innerHTML =
      events
        .map(eventCard)
        .join('');

    grid.scrollLeft = 0;

    grid
      .querySelectorAll('.reveal')
      .forEach((element) => {
        requestAnimationFrame(() => {
          element.classList.add('in');
        });
      });
  };

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
    30000
  );
})();