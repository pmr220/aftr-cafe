(() => {

  const API =
    window.AFTR_API_URL || '';

  let adminToken = "";
  let expiresAt = 0;
  let expiryTimer;


  const login =
    document.querySelector(
      '#adminLogin'
    );

  const dashboard =
    document.querySelector(
      '#dashboard'
    );


  if (!dashboard) {
    return;
  }


  let requests = [];
  let events = [];
  let calendarEntries = [];
  let menus = [];

  let requestFilter =
    'all';


  const esc =
    value =>
      String(
        value ?? ''
      ).replace(
        /[&<>"']/g,
        character =>
          ({
            '&':'&amp;',
            '<':'&lt;',
            '>':'&gt;',
            '"':'&quot;',
            "'":'&#039;'
          }[character])
      );


  const modal =
    document.querySelector(
      '#adminModal'
    );


  const modalForm =
    document.querySelector(
      '#modalForm'
    );


  function openModal(
    html
  ) {

    modalForm.innerHTML =
      html;

    modal.classList.add(
      'open'
    );

    modal.setAttribute(
      'aria-hidden',
      'false'
    );

  }


  function closeModal() {

    modal.classList.remove(
      'open'
    );

    modal.setAttribute(
      'aria-hidden',
      'true'
    );

  }


  document
    .querySelector(
      '#adminClose'
    )
    .addEventListener(
      'click',
      closeModal
    );


  document
    .querySelector(
      '.admin-modal-backdrop'
    )
    .addEventListener(
      'click',
      closeModal
    );


  /* =======================================================
     LOGIN
     ======================================================= */

  function signOut(message = '') {
    adminToken = '';
    expiresAt = 0;
    clearTimeout(expiryTimer);
    dashboard.hidden = true;
    login.hidden = false;
    requests = []; events = []; calendarEntries = []; menus = [];
    closeModal();
    renderAll();
    document.querySelector('#loginError').textContent = message;
    window.google?.accounts.id.disableAutoSelect();
  }

  document.querySelector('#adminSignOut').addEventListener('click', () => signOut());
  window.aftrInitGoogleLogin = () => {
    google.accounts.id.initialize({
      client_id: window.AFTR_GOOGLE_CLIENT_ID,
      auto_select: false,
      callback: async ({ credential }) => {
        const errorBox = document.querySelector('#loginError');
        errorBox.textContent = 'Verifying sign-in…';
        try {
          const response = await fetch('/api/admin-login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }), cache: 'no-store'
          });
          const result = await response.json();
          if (!response.ok || !result.token) throw new Error(result.error || 'Sign-in failed.');
          adminToken = result.token;
          expiresAt = result.expiresAt;
          clearTimeout(expiryTimer);
          expiryTimer = setTimeout(() => signOut('Session expired. Please sign in again.'), Math.max(0, expiresAt - Date.now()));
          errorBox.textContent = '';
          login.hidden = true;
          dashboard.hidden = false;
          await refreshAll();
        } catch (error) {
          signOut(error.message);
        }
      }
    });
    google.accounts.id.renderButton(document.querySelector('#googleSignIn'), { theme: 'outline', size: 'large' });
  };

  /* =======================================================
     TABS
     ======================================================= */

  document
    .querySelector(
      '.admin-tabs'
    )
    .addEventListener(
      'click',
      event => {

        if (
          !event.target.matches(
            '.admin-tab'
          )
        ) {
          return;
        }


        document
          .querySelectorAll(
            '.admin-tab'
          )
          .forEach(
            tab =>
              tab.classList.remove(
                'active'
              )
          );


        event.target.classList.add(
          'active'
        );


        document
          .querySelectorAll(
            '.dash-panel'
          )
          .forEach(
            panel =>
              panel.hidden =
                true
          );


        document
          .querySelector(
            '#adminTab-' +
            event.target.dataset.tab
          )
          .hidden =
            false;


        if (
          event.target.dataset.tab ===
          'menu'
        ) {

          loadMenus();

        }

      }
    );


  /* =======================================================
     API
     ======================================================= */

  async function post(payload) {
    if (!adminToken || Date.now() >= expiresAt) {
      signOut('Session expired. Please sign in again.');
      throw new Error('Please sign in again.');
    }
    const usedToken = adminToken;
    const isRead = ['admin_requests', 'admin_events', 'admin_availability', 'menu'].includes(payload.action);
    const response = await fetch(isRead ? '/api/admin-read' : API, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, adminToken: usedToken })
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error('Backend returned an invalid response. Please try again shortly.'); }
    if (usedToken !== adminToken) throw new Error('Session ended.');
    if (!data.ok) {
      if (data.code === 'UNAUTHORIZED') signOut('Please sign in again.');
      throw new Error(data.error || 'Backend request failed.');
    }
    return data;
  }

  async function get(action) {
    return post({ action: action === 'availability' ? 'admin_availability' : action });
  }

  /* =======================================================
     REFRESH
     ======================================================= */

  async function refreshAll() {
    const status = document.querySelector('#apiStatus');
    const session = adminToken;
    status.textContent = 'Loading dashboard…';
    const sections = [
      ['Requests', 'admin_requests', data => { requests = data.requests || []; }],
      ['Events', 'admin_events', data => { events = data.events || []; }],
      ['Calendar', 'availability', data => { calendarEntries = data.blocks || []; }],
      ['Menus', 'menu', data => { menus = data.menus || []; }]
    ];
    const results = await Promise.allSettled(sections.map(async ([name, action, apply]) => {
      const data = await get(action);
      if (!session || adminToken !== session) return;
      apply(data);
      renderAll();
    }));
    if (!session || adminToken !== session) return;
    const failed = sections.filter((_, index) => results[index].status === 'rejected').map(section => section[0]);
    status.textContent = failed.length
      ? 'Could not refresh: ' + failed.join(', ') + '. These sections may be empty or out of date. Please try signing in again shortly.'
      : 'Live backend connected';
  }

  /* =======================================================
     OVERVIEW
     ======================================================= */

  function renderOverview() {

    document
      .querySelector(
        '#statPending'
      )
      .textContent =
        requests.length;


    document
      .querySelector(
        '#statPublished'
      )
      .textContent =

        events.filter(
          event =>
            String(
              event.status
            ).toLowerCase() ===
            'published'
        ).length;


    document
      .querySelector(
        '#statCalendar'
      )
      .textContent =
        calendarEntries.length;


    document
      .querySelector(
        '#statMenus'
      )
      .textContent =
        menus.length;

  }


  /* =======================================================
     REQUEST FILTERS
     ======================================================= */

  document
    .querySelector(
      '#requestFilters'
    )
    .addEventListener(
      'click',
      event => {

        if (
          !event.target.matches(
            '.request-filter'
          )
        ) {
          return;
        }


        document
          .querySelectorAll(
            '.request-filter'
          )
          .forEach(
            button =>
              button.classList.remove(
                'active'
              )
          );


        event.target.classList.add(
          'active'
        );


        requestFilter =
          event.target.dataset.filter;


        renderRequests();

      }
    );


  function renderRequests() {

    const list =
      document.querySelector(
        '#requestList'
      );


    const filtered =
      requests.filter(
        request => {

          if (
            requestFilter ===
            'all'
          ) {
            return true;
          }


          return (
            request.requestGroup ===
            requestFilter
          );

        }
      );


    if (
      !filtered.length
    ) {

      list.innerHTML =
        '<div class="admin-empty">No pending requests here.</div>';

      return;

    }


    list.innerHTML =
      filtered
        .map(
          request => {

            const publicRequest =
              request.publicPublish;


            const approvalText =
              publicRequest
                ? 'Approve & Publish'
                : 'Approve';


            return `

              <article
                class="request-row"
              >

                <div>

                  <div class="request-tags">

                    <span
                      class="request-tag ${
                        publicRequest
                          ? 'public'
                          : 'private'
                      }"
                    >
                      ${
                        publicRequest
                          ? 'PUBLIC'
                          : 'PRIVATE'
                      }
                    </span>

                    <span
                      class="request-tag pending"
                    >
                      PENDING
                    </span>

                    <span
                      class="request-tag"
                    >
                      ${esc(
                        request.requestGroup
                      )}
                    </span>

                    <span
                      class="request-tag"
                    >
                      ${esc(
                        request.requestType
                      )}
                    </span>

                  </div>


                  <h3
                    class="request-title"
                  >
                    ${esc(
                      request.title ||
                      request.name ||
                      request.requestType
                    )}
                  </h3>


                  <div
                    class="request-meta"
                  >

                    ${esc(
                      request.name
                    )}

                    ·

                    ${esc(
                      request.phone
                    )}

                    ·

                    ${esc(
                      request.date
                    )}

                    ·

                    ${esc(
                      request.startTime
                    )}

                    —

                    ${esc(
                      request.endTime
                    )}

                  </div>


                  <div
                    class="request-about"
                  >
                    ${esc(
                      request.about
                    )}
                  </div>


                  <div
                    class="request-rule"
                  >

                    ${
                      publicRequest
                        ? 'Approve → Email + Calendar + Home + Events'
                        : 'Approve → Email + Calendar only'
                    }

                  </div>

                </div>


                <div
                  class="request-actions"
                >

                  <button
                    data-details="${esc(
                      request.id
                    )}"
                  >
                    Details
                  </button>

                  <button
                    class="primary"
                    data-approve="${esc(
                      request.id
                    )}"
                  >
                    ${approvalText}
                  </button>

                  <button
                    class="danger"
                    data-reject="${esc(
                      request.id
                    )}"
                  >
                    Reject
                  </button>

                </div>

              </article>

            `;

          }
        )
        .join('');


    bindRequestButtons();

  }


  function bindRequestButtons() {

    document
      .querySelectorAll(
        '[data-details]'
      )
      .forEach(
        button => {

          button.onclick =
            () => {

              const request =
                requests.find(
                  item =>
                    String(
                      item.id
                    ) ===
                    String(
                      button.dataset
                        .details
                    )
                );


              if (
                request
              ) {

                showRequestDetails(
                  request
                );

              }

            };

        }
      );


    document
      .querySelectorAll(
        '[data-approve]'
      )
      .forEach(
        button => {

          button.onclick =
            async () => {

              const request =
                requests.find(
                  item =>
                    String(
                      item.id
                    ) ===
                    String(
                      button.dataset
                        .approve
                    )
                );


              if (
                !request
              ) {
                return;
              }


              const message =
                request.publicPublish

                  ? 'Approve this Workshop/Event? It will be added to Google Calendar, emailed to the requester and published on Home + Events.'

                  : 'Approve this request? It will be added to Google Calendar and emailed to the requester, but not published on the website.';


              if (
                !confirm(
                  message
                )
              ) {
                return;
              }


              try {

                await post({

                  action:
                    'approve_request',

                  id:
                    request.id

                });


                await refreshAll();


              } catch (
                error
              ) {

                alert(
                  'Could not approve request: ' +
                  error.message
                );

              }

            };

        }
      );


    document
      .querySelectorAll(
        '[data-reject]'
      )
      .forEach(
        button => {

          button.onclick =
            async () => {

              const request =
                requests.find(
                  item =>
                    String(
                      item.id
                    ) ===
                    String(
                      button.dataset
                        .reject
                    )
                );


              if (
                !request
              ) {
                return;
              }


              if (
                !confirm(
                  'Reject this request? It will disappear from the active Requests list.'
                )
              ) {
                return;
              }


              try {

                await post({

                  action:
                    'reject_request',

                  id:
                    request.id

                });


                await refreshAll();


              } catch (
                error
              ) {

                alert(
                  'Could not reject request: ' +
                  error.message
                );

              }

            };

        }
      );

  }


  /* =======================================================
     REQUEST DETAILS
     ======================================================= */

  function showRequestDetails(
    request
  ) {

    openModal(`

      <div class="eyebrow">
        ${esc(
          request.requestGroup
        )} /
        ${esc(
          request.requestType
        )}
      </div>

      <h2>
        ${esc(
          request.title ||
          request.name ||
          request.requestType
        )}
      </h2>


      <form
        id="requestForm"
        class="admin-form"
      >

        <div
          class="admin-grid"
        >

          <label>
            Name

            <input
              id="rName"
              value="${esc(
                request.name
              )}"
            >
          </label>


          <label>
            WhatsApp

            <input
              id="rPhone"
              value="${esc(
                request.phone
              )}"
            >
          </label>


          <label>
            Email

            <input
              id="rEmail"
              value="${esc(
                request.email
              )}"
            >
          </label>


          <label>
            Date

            <input
              id="rDate"
              type="date"
              value="${esc(
                request.date
              )}"
            >
          </label>


          <label>
            Start

            <input
              id="rStart"
              type="time"
              value="${esc(
                request.startTime
              )}"
            >
          </label>


          <label>
            End

            <input
              id="rEnd"
              type="time"
              value="${esc(
                request.endTime
              )}"
            >
          </label>


          <label>
            Guests

            <input
              id="rGuests"
              type="number"
              value="${esc(
                request.guests
              )}"
            >
          </label>


          <label>
            Price

            <input
              id="rPrice"
              value="${esc(
                request.price
              )}"
            >
          </label>


          <label class="full">
            Title

            <input
              id="rTitle"
              value="${esc(
                request.title
              )}"
            >

          </label>


          <label class="full">
            Details

            <textarea
              id="rAbout"
              rows="6"
            >${esc(
              request.about
            )}</textarea>

          </label>

        </div>


        <button
          class="premium-submit"
          type="submit"
        >
          Save changes
          <span>↗</span>
        </button>


        <div
          id="requestSaveStatus"
          class="booking-success"
        ></div>

      </form>

    `);


    document
      .querySelector(
        '#requestForm'
      )
      .addEventListener(
        'submit',
        async event => {

          event.preventDefault();


          const status =
            document.querySelector(
              '#requestSaveStatus'
            );


          try {

            await post({

              action:
                'update_request',

              id:
                request.id,

              title:
                document
                  .querySelector(
                    '#rTitle'
                  )
                  .value
                  .trim(),

              name:
                document
                  .querySelector(
                    '#rName'
                  )
                  .value
                  .trim(),

              phone:
                document
                  .querySelector(
                    '#rPhone'
                  )
                  .value
                  .trim(),

              email:
                document
                  .querySelector(
                    '#rEmail'
                  )
                  .value
                  .trim(),

              date:
                document
                  .querySelector(
                    '#rDate'
                  )
                  .value,

              startTime:
                document
                  .querySelector(
                    '#rStart'
                  )
                  .value,

              endTime:
                document
                  .querySelector(
                    '#rEnd'
                  )
                  .value,

              guests:
                document
                  .querySelector(
                    '#rGuests'
                  )
                  .value,

              price:
                document
                  .querySelector(
                    '#rPrice'
                  )
                  .value
                  .trim(),

              about:
                document
                  .querySelector(
                    '#rAbout'
                  )
                  .value
                  .trim()

            });


            status.textContent =
              'Request updated.';


            status.classList.add(
              'show'
            );


            await refreshAll();

          } catch (
            error
          ) {

            status.textContent =
              'Could not save: ' +
              error.message;


            status.classList.add(
              'show'
            );

          }

        }
      );

  }


  /* =======================================================
     PUBLISHED EVENTS
     ======================================================= */

  function renderPublished() {

    const list =
      document.querySelector(
        '#publishedEventList'
      );


    const published =
      events.filter(
        event =>
          String(
            event.status
          ).toLowerCase() ===
          'published'
      );


    if (
      !published.length
    ) {

      list.innerHTML =
        '<div class="admin-empty">No published events yet.</div>';

      return;

    }


    list.innerHTML =
      published
        .map(
          event => `

            <article
              class="request-row"
            >

              <div>

                <div class="request-tags">

                  <span
                    class="request-tag public"
                  >
                    LIVE
                  </span>

                  <span
                    class="request-tag"
                  >
                    ${esc(
                      event.category
                    )}
                  </span>

                </div>


                <h3
                  class="request-title"
                >
                  ${esc(
                    event.title
                  )}
                </h3>


                <div
                  class="request-meta"
                >

                  ${esc(
                    event.date
                  )}

                  ·

                  ${esc(
                    event.time
                  )}

                  ·

                  ${esc(
                    event.organizer
                  )}

                </div>


                <div
                  class="request-about"
                >
                  ${esc(
                    event.about
                  )}
                </div>

              </div>


              <div
                class="request-actions"
              >

                <button
                  data-edit-event="${esc(
                    event.id
                  )}"
                >
                  Edit
                </button>

                <button
                  class="danger"
                  data-unpublish-event="${esc(
                    event.id
                  )}"
                >
                  Unpublish
                </button>

              </div>

            </article>

          `
        )
        .join('');


    document
      .querySelectorAll(
        '[data-edit-event]'
      )
      .forEach(
        button => {

          button.onclick =
            () => {

              const event =
                events.find(
                  item =>
                    String(
                      item.id
                    ) ===
                    String(
                      button.dataset
                        .editEvent
                    )
                );


              if (
                event
              ) {

                showEventEditor(
                  event
                );

              }

            };

        }
      );


    document
      .querySelectorAll(
        '[data-unpublish-event]'
      )
      .forEach(
        button => {

          button.onclick =
            async () => {

              if (
                !confirm(
                  'Unpublish this event from Home and the Events page?'
                )
              ) {
                return;
              }


              try {

                await post({

                  action:
                    'unpublish_event',

                  id:
                    button.dataset
                      .unpublishEvent

                });


                await refreshAll();


              } catch (
                error
              ) {

                alert(
                  'Could not unpublish event: ' +
                  error.message
                );

              }

            };

        }
      );

  }


  /* =======================================================
     EVENT EDITOR
     ======================================================= */

  function showEventEditor(
    event
  ) {

    openModal(`

      <div class="eyebrow">
        Published event
      </div>

      <h2>
        Edit event
      </h2>


      <form
        id="eventEditForm"
        class="admin-form"
      >

        <div
          class="admin-grid"
        >

          <label>
            Event title

            <input
              id="eTitle"
              value="${esc(
                event.title
              )}"
              required
            >

          </label>


          <label>
            Date

            <input
              id="eDate"
              type="date"
              value="${esc(
                event.date
              )}"
              required
            >

          </label>


          <label>
            Start

            <input
              id="eStart"
              type="time"
              value="${esc(
                event.startTime
              )}"
              required
            >

          </label>


          <label>
            End

            <input
              id="eEnd"
              type="time"
              value="${esc(
                event.endTime
              )}"
              required
            >

          </label>


          <label>
            Price

            <input
              id="ePrice"
              value="${esc(
                event.price
              )}"
            >

          </label>


          <label>
            Organiser

            <input
              id="eOrganizer"
              value="${esc(
                event.organizer
              )}"
            >

          </label>


          <label>
            WhatsApp

            <input
              id="ePhone"
              value="${esc(
                event.phone
              )}"
            >

          </label>


          <label>
            Email

            <input
              id="eEmail"
              value="${esc(
                event.email
              )}"
            >

          </label>


          <label class="full">
            About

            <textarea
              id="eAbout"
              rows="6"
            >${esc(
              event.about
            )}</textarea>

          </label>

        </div>


        <button
          class="premium-submit"
          type="submit"
        >
          Save event
          <span>↗</span>
        </button>


        <div
          id="eventSaveStatus"
          class="booking-success"
        ></div>

      </form>

    `);


    document
      .querySelector(
        '#eventEditForm'
      )
      .addEventListener(
        'submit',
        async eventSubmit => {

          eventSubmit.preventDefault();


          const status =
            document.querySelector(
              '#eventSaveStatus'
            );


          try {

            await post({

              action:
                'save_event',

              id:
                event.id,

              title:
                document
                  .querySelector(
                    '#eTitle'
                  )
                  .value
                  .trim(),

              date:
                document
                  .querySelector(
                    '#eDate'
                  )
                  .value,

              startTime:
                document
                  .querySelector(
                    '#eStart'
                  )
                  .value,

              endTime:
                document
                  .querySelector(
                    '#eEnd'
                  )
                  .value,

              price:
                document
                  .querySelector(
                    '#ePrice'
                  )
                  .value
                  .trim(),

              organizer:
                document
                  .querySelector(
                    '#eOrganizer'
                  )
                  .value
                  .trim(),

              phone:
                document
                  .querySelector(
                    '#ePhone'
                  )
                  .value
                  .trim(),

              email:
                document
                  .querySelector(
                    '#eEmail'
                  )
                  .value
                  .trim(),

              about:
                document
                  .querySelector(
                    '#eAbout'
                  )
                  .value
                  .trim(),

              status:
                'Published'

            });


            status.textContent =
              'Event updated.';


            status.classList.add(
              'show'
            );


            await refreshAll();

          } catch (
            error
          ) {

            status.textContent =
              'Could not save: ' +
              error.message;


            status.classList.add(
              'show'
            );

          }

        }
      );

  }


  /* =======================================================
     CALENDAR
     ======================================================= */

  function renderCalendar() {

    const list =
      document.querySelector(
        '#availabilityList'
      );


    if (
      !calendarEntries.length
    ) {

      list.innerHTML =
        '<div class="admin-empty">No active calendar entries.</div>';

      return;

    }


    list.innerHTML =
      calendarEntries
        .slice()
        .sort((a, b) =>
          `${b.date || ''} ${b.start || ''}`.localeCompare(`${a.date || ''} ${a.start || ''}`)
        )
        .map(
          block => `

            <article
              class="request-row"
            >

              <div>

                <div
                  class="request-tags"
                >

                  <span
                    class="request-tag public"
                  >
                    ACTIVE
                  </span>

                  <span
                    class="request-tag"
                  >
                    ${esc(
                      block.type
                    )}
                  </span>

                </div>


                <h3
                  class="request-title"
                >
                  ${esc(
                    block.note
                  )}
                </h3>


                <div
                  class="request-meta"
                >

                  ${esc(
                    block.date
                  )}

                  ·

                  ${esc(
                    block.start
                  )}

                  —

                  ${esc(
                    block.end
                  )}

                </div>

              </div>

            </article>

          `
        )
        .join('');

  }


  /* =======================================================
     MANUAL BLOCK
     ======================================================= */

  document
    .querySelector(
      '#newBlock'
    )
    .addEventListener(
      'click',
      () => {

        openModal(`

          <div class="eyebrow">
            Calendar
          </div>

          <h2>
            Add manual block
          </h2>


          <form
            id="blockForm"
            class="admin-form"
          >

            <div
              class="admin-grid"
            >

              <label>
                Type

                <select
                  id="blockType"
                >

                  <option>
                    Cafe booking
                  </option>

                  <option>
                    Table reservation
                  </option>

                  <option>
                    Space booking
                  </option>

                  <option>
                    Other
                  </option>

                </select>

              </label>


              <label>
                Date

                <input
                  id="blockDate"
                  type="date"
                  required
                >

              </label>


              <label>
                Start

                <input
                  id="blockStart"
                  type="time"
                  required
                >

              </label>


              <label>
                End

                <input
                  id="blockEnd"
                  type="time"
                  required
                >

              </label>


              <label class="full">
                Note

                <input
                  id="blockNote"
                  required
                  placeholder="e.g. AFTR team booking"
                >

              </label>

            </div>


            <button
              class="premium-submit"
              type="submit"
            >
              Add calendar block
              <span>↗</span>
            </button>


            <div
              id="blockStatus"
              class="booking-success"
            ></div>

          </form>

        `);


        document
          .querySelector(
            '#blockForm'
          )
          .addEventListener(
            'submit',
            async event => {

              event.preventDefault();


              try {

                await post({

                  action:
                    'block_slot',

                  id:
                    'MANUAL-' +
                    Date.now(),

                  type:
                    document
                      .querySelector(
                        '#blockType'
                      )
                      .value,

                  date:
                    document
                      .querySelector(
                        '#blockDate'
                      )
                      .value,

                  start:
                    document
                      .querySelector(
                        '#blockStart'
                      )
                      .value,

                  end:
                    document
                      .querySelector(
                        '#blockEnd'
                      )
                      .value,

                  note:
                    document
                      .querySelector(
                        '#blockNote'
                      )
                      .value
                      .trim(),

                  status:
                    'Active'

                });


                await refreshAll();

                closeModal();


              } catch (
                error
              ) {

                document
                  .querySelector(
                    '#blockStatus'
                  )
                  .textContent =
                    'Could not add block: ' +
                    error.message;

              }

            }
          );

      }
    );


  /* =======================================================
     MENU
     ======================================================= */

  async function loadMenus() {

    try {

      const data =
        await get(
          'menu'
        );


      menus =
        data.menus ||
        [];


      renderMenus();

      renderOverview();


    } catch (
      error
    ) {

      console.error(
        error
      );

    }

  }


  function renderMenus() {

    const list =
      document.querySelector(
        '#menuAdminList'
      );


    if (
      !menus.length
    ) {

      list.innerHTML =
        '<div class="admin-empty">No menu PDFs uploaded.</div>';

      return;

    }


    list.innerHTML =
      menus
        .map(
          menu => `

            <article
              class="request-row"
            >

              <div>

                <div
                  class="request-tags"
                >

                  <span
                    class="request-tag public"
                  >
                    ACTIVE
                  </span>

                </div>


                <h3
                  class="request-title"
                >
                  ${esc(
                    menu.title
                  )}
                </h3>


                <div
                  class="request-meta"
                >

                  ${esc(
                    menu.uploadedAt
                  )}

                  ·

                  <a
                    href="${esc(
                      menu.url
                    )}"
                    target="_blank"
                    rel="noopener"
                  >
                    Open PDF ↗
                  </a>

                </div>

              </div>


              <div
                class="request-actions"
              >

                <button
                  class="danger"
                  data-delete-menu="${esc(
                    menu.id
                  )}"
                >
                  Remove
                </button>

              </div>

            </article>

          `
        )
        .join('');


    document
      .querySelectorAll(
        '[data-delete-menu]'
      )
      .forEach(
        button => {

          button.onclick =
            async () => {

              if (
                !confirm(
                  'Remove this menu PDF?'
                )
              ) {
                return;
              }


              try {

                await post({

                  action:
                    'delete_menu_pdf',

                  id:
                    button.dataset
                      .deleteMenu

                });


                await loadMenus();


              } catch (
                error
              ) {

                alert(
                  error.message
                );

              }

            };

        }
      );

  }


  document
    .querySelector(
      '#menuUploadForm'
    )
    .addEventListener(
      'submit',
      async event => {

        event.preventDefault();


        const file =
          document
            .querySelector(
              '#menuFile'
            )
            .files[0];


        const status =
          document
            .querySelector(
              '#menuUploadStatus'
            );


        if (!file) {

          status.textContent =
            'Please select a PDF.';

          status.classList.add(
            'show'
          );

          return;

        }


        const max =
          15 *
          1024 *
          1024;


        if (
          file.size >
          max
        ) {

          status.textContent =
            'Please keep the PDF under 15 MB.';

          status.classList.add(
            'show'
          );

          return;

        }


        status.textContent =
          'Uploading…';


        status.classList.add(
          'show'
        );


        const reader =
          new FileReader();


        reader.onload =
          async () => {

            try {

              await post({

                action:
                  'save_menu_pdf',

                title:
                  document
                    .querySelector(
                      '#menuTitle'
                    )
                    .value
                    .trim(),

                data:
                  reader.result

              });


              status.textContent =
                'Menu updated successfully.';


              document
                .querySelector(
                  '#menuUploadForm'
                )
                .reset();


              await loadMenus();


            } catch (
              error
            ) {

              status.textContent =
                'Could not upload: ' +
                error.message;


              status.classList.add(
                'show'
              );

            }

          };


        reader.readAsDataURL(
          file
        );

      }
    );


  document
    .querySelector(
      '#refreshMenu'
    )
    .addEventListener(
      'click',
      loadMenus
    );


  /* =======================================================
     RENDER
     ======================================================= */

  function renderAll() {

    renderOverview();

    renderRequests();

    renderPublished();

    renderCalendar();

    renderMenus();

  }

})();
