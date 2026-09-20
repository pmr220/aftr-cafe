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
  const normalizeImageUrl = (value) => {
    const url =
      String(value || '')
        .trim();

    if (!url) {
      return '';
    }

    if (
      url.startsWith(
        'data:image/'
      )
    ) {
      return url;
    }

    let match;

    /*
     * /file/d/FILE_ID/view
     */
    match =
      url.match(
        /drive\.google\.com\/file\/d\/([^/]+)/i
      );

    if (match) {
      return (
        'https://drive.google.com/thumbnail?id=' +
        encodeURIComponent(match[1]) +
        '&sz=w1600'
      );
    }

    /*
     * /uc?...id=FILE_ID
     */
    if (
      /drive\.google\.com\/uc/i.test(
        url
      )
    ) {
      match =
        url.match(
          /[?&]id=([^&]+)/i
        );

      if (match) {
        return (
          'https://drive.google.com/thumbnail?id=' +
          encodeURIComponent(match[1]) +
          '&sz=w1600'
        );
      }
    }

    /*
     * /open?id=FILE_ID
     */
    if (
      /drive\.google\.com\/open/i.test(
        url
      )
    ) {
      match =
        url.match(
          /[?&]id=([^&]+)/i
        );

      if (match) {
        return (
          'https://drive.google.com/thumbnail?id=' +
          encodeURIComponent(match[1]) +
          '&sz=w1600'
        );
      }
    }

    /*
     * Already a thumbnail URL.
     */
    if (
      /drive\.google\.com\/thumbnail/i.test(
        url
      )
    ) {
      match =
        url.match(
          /[?&]id=([^&]+)/i
        );

      if (match) {
        return (
          'https://drive.google.com/thumbnail?id=' +
          encodeURIComponent(match[1]) +
          '&sz=w1600'
        );
      }
    }

    /*
     * drive.usercontent.google.com
     */
    if (
      /drive\.usercontent\.google\.com/i.test(
        url
      )
    ) {
      match =
        url.match(
          /[?&]id=([^&]+)/i
        );

      if (match) {
        return (
          'https://drive.google.com/thumbnail?id=' +
          encodeURIComponent(match[1]) +
          '&sz=w1600'
        );
      }
    }

    return url;
  };

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

  const load = async () => {
    events = [];

    if (API) {

      try {

        const response =
          await fetch(
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
          normalizeEvents(
            Array.isArray(
              data.events
            )
              ? data.events
              : []
          );

      } catch (error) {

        console.error(
          'AFTR public events error:',
          error
        );

      }
    }

    const activeFilter =
      document
        .querySelector(
          '#eventFilter button.active'
        )
        ?.dataset.filter ||
      'all';

    render(
      activeFilter
    );
  };

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
    30000
  );
})();