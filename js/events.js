(() => {
  const grid = document.querySelector('#eventsGrid');
  if (!grid) return;

  const empty =
    document.querySelector('#eventsEmpty');

  const API =
    window.AFTR_API_URL || '';

  let events = [];

  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m])
    );

  const isPublished = (event) => {
    const status =
      String(
        event?.status || ''
      )
        .trim()
        .toLowerCase();

    return (
      status === 'published' ||
      status === 'approved'
    );
  };

  const fmtDate = (dateValue) => {
    const value =
      String(dateValue || '')
        .trim();

    const date =
      new Date(
        value + 'T12:00:00'
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      'en-IN',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }
    );
  };

  const daysUntil = (dateValue) => {
    const target =
      new Date(
        String(dateValue) +
        'T12:00:00'
      );

    const now =
      new Date();

    now.setHours(
      12,
      0,
      0,
      0
    );

    if (
      Number.isNaN(
        target.getTime()
      )
    ) {
      return 99999;
    }

    return Math.round(
      (target - now) /
      86400000
    );
  };

  const normalizePhone = (phone) => {
    let digits =
      String(phone || '')
        .replace(
          /\D/g,
          ''
        );

    if (!digits) {
      return '';
    }

    if (digits.length === 10) {
      digits =
        '91' + digits;
    }

    if (
      digits.length === 11 &&
      digits.startsWith('0')
    ) {
      digits =
        '91' +
        digits.slice(1);
    }

    return digits;
  };

  /*
   * Google Drive image conversion.
   */
  const normalizeImageUrl = window.AFTR_PUBLIC_EVENTS.image;

  const getImage = (event) => {
    const raw =
      String(
        event?.imageUrls ||
        event?.image ||
        ''
      );

    return raw
      .split('|')
      .map(
        (item) =>
          item.trim()
      )
      .map(
        normalizeImageUrl
      )
      .find(Boolean) || '';
  };

  const whatsappUrl = (event) => {
    const phone =
      normalizePhone(
        event.phone
      );

    if (!phone) {
      return '#';
    }

    const message = [
      `Hello ${event.organizer || 'organiser'},`,
      `I am interested in “${event.title || 'this event'}” at AFTR.`,
      `Date: ${fmtDate(event.date)}`,
      `Time: ${event.time || event.timeDisplay || ''}`,
      '',
      'Please share the booking details.'
    ].join('\n');

    return (
      'https://wa.me/' +
      phone +
      '?text=' +
      encodeURIComponent(
        message
      )
    );
  };

  const normalizeEvents = (list) => {
    return list
      .filter(
        (event) =>
          isPublished(event) &&
          event.date
      )
      .map((event) => ({
        ...event,
        date:
          String(
            event.date
          ).slice(0, 10)
      }))
      .sort((a, b) => {
        const dateCompare =
          a.date.localeCompare(
            b.date
          );

        if (
          dateCompare !== 0
        ) {
          return dateCompare;
        }

        return String(
          a.startTime || ''
        ).localeCompare(
          String(
            b.startTime || ''
          )
        );
      });
  };

  const cardHtml = (event) => {
    const image =
      getImage(event);

    const whatsapp =
      whatsappUrl(event);

    const canBook =
      whatsapp !== '#';

    return `
      <article
        class="event-card reveal"
        data-id="${esc(
          event.id || ''
        )}"
      >

        <div class="event-card-image">

          ${
            image
              ? `
                <img
                  src="${esc(image)}"
                  alt="${esc(
                    event.title ||
                    'AFTR event'
                  )}"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                >
              `
              : `
                <div class="event-card-placeholder"></div>
              `
          }

          <span class="event-badge">
            ${esc(
              event.price ||
              'Enquire'
            )}
          </span>

        </div>

        <div class="event-card-body">

          <span class="eyebrow">
            ${esc(
              fmtDate(
                event.date
              )
            )}
          </span>

          <h3>
            ${esc(
              event.title ||
              'AFTR Event'
            )}
          </h3>

          <p>
            ${esc(
              event.about ||
              'Join us at AFTR for this upcoming event.'
            )}
          </p>

          <div class="event-card-foot">

            <span>
              ${esc(
                event.time ||
                event.timeDisplay ||
                ''
              )}
            </span>

            <div class="event-card-actions">

              <button
                class="text-link"
                data-event="${esc(
                  event.id || ''
                )}"
                type="button"
              >
                View event ↗
              </button>

              ${
                canBook
                  ? `
                    <a
                      class="text-link event-book-link"
                      href="${esc(
                        whatsapp
                      )}"
                      target="_blank"
                      rel="noopener"
                    >
                      Book ↗
                    </a>
                  `
                  : `
                    <span class="text-link event-book-disabled">
                      Contact organiser
                    </span>
                  `
              }

            </div>

          </div>

        </div>

      </article>
    `;
  };

  const render = (filter) => {
    let list =
      events.slice();

    if (
      filter === 'this-week'
    ) {
      list =
        list.filter(
          (event) => {
            const days =
              daysUntil(
                event.date
              );

            return (
              days >= 0 &&
              days <= 7
            );
          }
        );
    }

    if (
      filter === 'next'
    ) {
      list =
        list
          .filter(
            (event) =>
              daysUntil(
                event.date
              ) >= 0
          )
          .slice(
            0,
            6
          );
    }

    empty.hidden =
      list.length > 0;

    grid.innerHTML =
      list
        .map(cardHtml)
        .join('');

    grid
      .querySelectorAll(
        '.reveal'
      )
      .forEach(
        (element) => {
          requestAnimationFrame(
            () => {
              element.classList.add(
                'in'
              );
            }
          );
        }
      );

    grid
      .querySelectorAll(
        '[data-event]'
      )
      .forEach(
        (button) => {

          button.addEventListener(
            'click',
            (event) => {

              event.stopPropagation();

              const selected =
                events.find(
                  (item) =>
                    String(
                      item.id
                    ) ===
                    String(
                      button.dataset.event
                    )
                );

              openEvent(
                selected
              );
            }
          );

        }
      );

    grid
      .querySelectorAll(
        '.event-card'
      )
      .forEach(
        (card) => {

          card.addEventListener(
            'click',
            (event) => {

              if (
                event.target.closest(
                  'a, button'
                )
              ) {
                return;
              }

              const selected =
                events.find(
                  (item) =>
                    String(
                      item.id
                    ) ===
                    String(
                      card.dataset.id
                    )
                );

              openEvent(
                selected
              );
            }
          );

        }
      );
  };

  const modal =
    document.querySelector(
      '#eventModal'
    );

  const modalImage =
    document.querySelector(
      '#eventModalImage'
    );

  const modalDate =
    document.querySelector(
      '#eventModalDate'
    );

  const modalTitle =
    document.querySelector(
      '#eventModalTitle'
    );

  const modalPrice =
    document.querySelector(
      '#eventModalPrice'
    );

  const modalAbout =
    document.querySelector(
      '#eventModalAbout'
    );

  const modalMeta =
    document.querySelector(
      '#eventModalMeta'
    );

  const modalWhatsApp =
    document.querySelector(
      '#eventModalWhatsApp'
    );

  const openEvent = (event) => {
    if (
      !event ||
      !modal
    ) {
      return;
    }

    modalDate.textContent =
      `${fmtDate(event.date)} · ${
        event.time ||
        event.timeDisplay ||
        ''
      }`;

    modalTitle.textContent =
      event.title ||
      'AFTR Event';

    modalPrice.textContent =
      event.price ||
      'Price on enquiry';

    modalAbout.textContent =
      event.about ||
      '';

    modalMeta.innerHTML = `
      <div>
        <span>Organiser</span>
        <strong>
          ${esc(
            event.organizer ||
            'Event organiser'
          )}
        </strong>
      </div>

      <div>
        <span>Category</span>
        <strong>
          ${esc(
            event.category ||
            'Event'
          )}
        </strong>
      </div>

      <div>
        <span>Date</span>
        <strong>
          ${esc(
            fmtDate(
              event.date
            )
          )}
        </strong>
      </div>

      <div>
        <span>Time</span>
        <strong>
          ${esc(
            event.time ||
            event.timeDisplay ||
            ''
          )}
        </strong>
      </div>

      <div>
        <span>Location</span>
        <strong>
          ${esc(
            event.location ||
            'AFTR — All Day Cafe'
          )}
        </strong>
      </div>

      <div>
        <span>Host WhatsApp</span>
        <strong>
          ${esc(
            event.phone ||
            'Not provided'
          )}
        </strong>
      </div>
    `;

    const image =
      getImage(event);

    modalImage.innerHTML =
      image
        ? `
          <img
            src="${esc(image)}"
            alt="${esc(
              event.title ||
              'AFTR event'
            )}"
            referrerpolicy="no-referrer"
          >
        `
        : `
          <div class="event-card-placeholder"></div>
        `;

    const href =
      whatsappUrl(event);

    if (href === '#') {

      modalWhatsApp.removeAttribute(
        'href'
      );

      modalWhatsApp.setAttribute(
        'aria-disabled',
        'true'
      );

      modalWhatsApp.classList.add(
        'disabled'
      );

      modalWhatsApp.textContent =
        'Host WhatsApp not provided';

    } else {

      modalWhatsApp.href =
        href;

      modalWhatsApp.removeAttribute(
        'aria-disabled'
      );

      modalWhatsApp.classList.remove(
        'disabled'
      );

      modalWhatsApp.innerHTML =
        'Book via WhatsApp <span>↗</span>';
    }

    modal.classList.add(
      'open'
    );

    modal.setAttribute(
      'aria-hidden',
      'false'
    );

    document.body.classList.add(
      'modal-open'
    );
  };

  const close = () => {
    if (!modal) return;

    modal.classList.remove(
      'open'
    );

    modal.setAttribute(
      'aria-hidden',
      'true'
    );

    document.body.classList.remove(
      'modal-open'
    );
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
    events = normalizeEvents(list);
    render(document.querySelector('#eventFilter button.active')?.dataset.filter || 'all');
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

  document
    .querySelector(
      '#eventClose'
    )
    ?.addEventListener(
      'click',
      close
    );

  document
    .querySelector(
      '.event-modal-backdrop'
    )
    ?.addEventListener(
      'click',
      close
    );

  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key === 'Escape'
      ) {
        close();
      }
    }
  );

  document
    .querySelector(
      '#eventFilter'
    )
    ?.addEventListener(
      'click',
      (event) => {

        const button =
          event.target.closest(
            'button'
          );

        if (!button) {
          return;
        }

        document
          .querySelectorAll(
            '#eventFilter button'
          )
          .forEach(
            (item) => {
              item.classList.remove(
                'active'
              );
            }
          );

        button.classList.add(
          'active'
        );

        render(
          button.dataset.filter ||
          'all'
        );
      }
    );

  load();

  window.setInterval(
    load,
    60000
  );
})();