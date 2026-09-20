(() => {
  const form =
    document.querySelector(
      '#spaceForm'
    );

  if (!form) return;

  const API =
    window.AFTR_API_URL || '';

  const types = [
    ...document.querySelectorAll(
      '.booking-type'
    )
  ];

  const typeInput =
    document.querySelector(
      '#spaceType'
    );

  const date =
    document.querySelector(
      '#sDate'
    );

  const start =
    document.querySelector(
      '#sStart'
    );

  const end =
    document.querySelector(
      '#sEnd'
    );

  const msg =
    document.querySelector(
      '#spaceAvailabilityMessage'
    );

  const live =
    document.querySelector(
      '#spaceLiveStatus'
    );

  const success =
    document.querySelector(
      '#spaceSuccess'
    );

  const pad = (n) =>
    String(n).padStart(
      2,
      '0'
    );

  const today =
    new Date();

  if (date) {
    date.min =
      `${today.getFullYear()}-${
        pad(
          today.getMonth() + 1
        )
      }-${pad(
        today.getDate()
      )}`;
  }

  let blocks = [];

  const mins = (
    value
  ) => {
    const parts =
      String(
        value ||
        '00:00'
      )
        .split(':')
        .map(Number);

    return (
      (parts[0] || 0) *
      60 +
      (parts[1] || 0)
    );
  };

  const overlap = (
    a,
    b,
    c,
    d
  ) =>
    Math.max(
      mins(a),
      mins(c)
    ) <
    Math.min(
      mins(b),
      mins(d)
    );

  const setSuccess = (
    text
  ) => {
    if (!success) {
      return;
    }

    success.textContent =
      text;

    success.classList.add(
      'show'
    );
  };

  const selectedType =
    () =>
      String(
        typeInput?.value ||
        document.querySelector(
          '.booking-type.active'
        )?.dataset.type ||
        'Workshop'
      ).trim();

  async function load() {
    if (!API) {
      if (live) {
        live.textContent =
          '● Backend not connected';
      }

      return;
    }

    try {
      const response =
        await fetch(
          API +
          '?action=availability',
          {
            cache:
              'no-store'
          }
        );

      const data =
        await response.json();

      blocks =
        Array.isArray(
          data.blocks
        )
          ? data.blocks
          : [];

      if (live) {
        live.textContent =
          '● Live availability';
      }

    } catch (error) {
      console.error(
        'AFTR availability error:',
        error
      );

      if (live) {
        live.textContent =
          '● Offline preview';
      }
    }
  }

  function check() {
    if (!date.value) {
      msg.textContent =
        'Choose a date and time to check availability.';

      return false;
    }

    if (
      start.value &&
      end.value &&
      mins(
        end.value
      ) <=
      mins(
        start.value
      )
    ) {
      msg.textContent =
        'End time must be after start time.';

      msg.classList.add(
        'blocked'
      );

      return false;
    }

    const hits =
      blocks.filter(
        (item) => {
          if (
            item.status ===
            'cancelled'
          ) {
            return false;
          }

          if (
            item.date !==
            date.value
          ) {
            return false;
          }

          if (
            !start.value ||
            !end.value
          ) {
            return false;
          }

          return overlap(
            start.value,
            end.value,
            item.start ||
              '00:00',
            item.end ||
              '23:59'
          );
        }
      );

    if (
      hits.length
    ) {
      msg.innerHTML =
        '<strong>Booked / unavailable</strong><br>' +
        hits
          .map(
            (item) =>
              `${
                item.start ||
                ''
              } — ${
                item.end ||
                ''
              } · ${
                item.note ||
                'Cafe booking'
              }`
          )
          .join('<br>');

      msg.classList.add(
        'blocked'
      );

      return false;
    }

    msg.textContent =
      'Available to enquire — AFTR confirms the request after review.';

    msg.classList.remove(
      'blocked'
    );

    return true;
  }

  types.forEach(
    (button) => {
      button.addEventListener(
        'click',
        () => {
          types.forEach(
            (item) =>
              item.classList.remove(
                'active'
              )
          );

          button.classList.add(
            'active'
          );

          if (
            typeInput
          ) {
            typeInput.value =
              button.dataset.type ||
              'Workshop';
          }
        }
      );
    }
  );

  [
    date,
    start,
    end
  ].forEach(
    (field) => {
      field?.addEventListener(
        'change',
        check
      );
    }
  );

  load().then(
    check
  );

  async function photosFromInput() {
    const input =
      document.querySelector(
        '#sImage'
      );

    if (!input) {
      return [];
    }

    const files =
      [
        ...input.files
      ].slice(
        0,
        4
      );

    return Promise.all(
      files.map(
        (file) =>
          new Promise(
            (
              resolve,
              reject
            ) => {
              const reader =
                new FileReader();

              reader.onload =
                () => {
                  const image =
                    new Image();

                  image.onload =
                    () => {
                      const max =
                        1400;

                      const scale =
                        Math.min(
                          1,
                          max /
                            Math.max(
                              image.width,
                              image.height
                            )
                        );

                      const canvas =
                        document.createElement(
                          'canvas'
                        );

                      canvas.width =
                        Math.round(
                          image.width *
                          scale
                        );

                      canvas.height =
                        Math.round(
                          image.height *
                          scale
                        );

                      const context =
                        canvas.getContext(
                          '2d'
                        );

                      context.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                      );

                      resolve(
                        canvas.toDataURL(
                          'image/jpeg',
                          0.78
                        )
                      );
                    };

                  image.onerror =
                    reject;

                  image.src =
                    reader.result;
                };

              reader.onerror =
                reject;

              reader.readAsDataURL(
                file
              );
            }
          )
      )
    );
  }

  form.addEventListener(
    'submit',
    async (
      event
    ) => {
      event.preventDefault();

      if (!check()) {
        return;
      }

      const requestType =
        selectedType();

      const payload = {
        action:
          'submit_event',

        /*
          These two fields are important.
          They tell the backend exactly
          which Book a Space option was selected.
        */
        requestGroup:
          'Book a Space',

        requestType:
          requestType,

        id:
          'REQ-' +
          Date.now(),

        status:
          'pending',

        title:
          document
            .querySelector(
              '#sTitle'
            )
            ?.value.trim() ||
          '',

        organizer:
          document
            .querySelector(
              '#sOrg'
            )
            ?.value.trim() ||
          '',

        phone:
          document
            .querySelector(
              '#sPhone'
            )
            ?.value.trim() ||
          '',

        email:
          document
            .querySelector(
              '#sEmail'
            )
            ?.value.trim() ||
          '',

        guests:
          document
            .querySelector(
              '#sGuests'
            )
            ?.value.trim() ||
          '',

        date:
          date.value,

        startTime:
          start.value,

        endTime:
          end.value,

        price:
          document
            .querySelector(
              '#sPrice'
            )
            ?.value.trim() ||
          '',

        about:
          document
            .querySelector(
              '#sAbout'
            )
            ?.value.trim() ||
          '',

        images:
          await photosFromInput(),

        sourcePage:
          'book.html',

        location:
          'AFTR — All Day Cafe'
      };

      if (!API) {
        setSuccess(
          'AFTR backend is not connected.'
        );

        return;
      }

      try {
        const response =
          await fetch(
            API,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'text/plain;charset=utf-8'
              },

              body:
                JSON.stringify(
                  payload
                )
            }
          );

        const data =
          await response.json();

        if (!data.ok) {
          throw new Error(
            data.error ||
            'Submission failed'
          );
        }

        setSuccess(
          `${requestType} request sent to AFTR. After approval, only public event types are published on Home and Events.`
        );

        form.reset();

        if (
          typeInput
        ) {
          typeInput.value =
            'Workshop';
        }

        types.forEach(
          (
            button,
            index
          ) =>
            button.classList.toggle(
              'active',
              index === 0
            )
        );

      } catch (error) {
        setSuccess(
          'Could not submit: ' +
          error.message
        );
      }
    }
  );
})();