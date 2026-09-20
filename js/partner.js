(() => {

  const API =
    window.AFTR_API_URL || '';


  const buttons =
    [
      ...document.querySelectorAll(
        '[data-partner-view]'
      )
    ];


  const collaboration =
    document.querySelector(
      '#partnerCollabSection'
    );


  const events =
    document.querySelector(
      '#partnerEventSection'
    );


  buttons.forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          buttons.forEach(
            item =>
              item.classList.remove(
                'active'
              )
          );


          button.classList.add(
            'active'
          );


          const isEvent =
            button.dataset
              .partnerView ===
            'event';


          collaboration.hidden =
            isEvent;


          events.hidden =
            !isEvent;

        }
      );

    }
  );


  async function post(
    data
  ) {

    if (!API) {

      throw new Error(
        'AFTR backend is not connected.'
      );

    }


    const response =
      await fetch(
        API,
        {

          method:
            'POST',

          headers:
            {
              'Content-Type':
                'text/plain;charset=utf-8'
            },

          body:
            JSON.stringify(
              data
            )

        }
      );


    const result =
      await response.json();


    if (
      !result.ok
    ) {

      throw new Error(
        result.error ||
        'Submission failed.'
      );

    }


    return result;

  }


  function readImages() {

    const input =
      document.querySelector(
        '#peImage'
      );


    if (
      !input
    ) {
      return Promise.resolve([]);
    }


    return Promise.all(

      [
        ...input.files
      ]
        .slice(
          0,
          4
        )
        .map(
          file =>
            new Promise(
              resolve => {

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
                          document
                            .createElement(
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


                        canvas
                          .getContext(
                            '2d'
                          )
                          .drawImage(
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


                    image.src =
                      reader.result;

                  };


                reader.readAsDataURL(
                  file
                );

              }
            )
        )

    );

  }


  /* =======================================================
     COLLABORATION
     ======================================================= */

  const collaborationForm =
    document.querySelector(
      '#partnerForm'
    );


  if (
    collaborationForm
  ) {

    collaborationForm.addEventListener(
      'submit',
      async event => {

        event.preventDefault();


        const success =
          document.querySelector(
            '#partnerSuccess'
          );


        try {

          const start =
            document.querySelector(
              '#pStart'
            ).value;


          const end =
            document.querySelector(
              '#pEnd'
            ).value;


          if (
            !start ||
            !end ||
            end <= start
          ) {

            throw new Error(
              'Please select a valid start and end time.'
            );

          }


          await post({

            action:
              'collaboration',

            name:
              document.querySelector(
                '#pName'
              ).value.trim(),

            phone:
              document.querySelector(
                '#pPhone'
              ).value.trim(),

            email:
              document.querySelector(
                '#pEmail'
              ).value.trim(),

            collaborationType:
              document.querySelector(
                '#pCollabType'
              ).value,

            date:
              document.querySelector(
                '#pDate'
              ).value,

            startTime:
              start,

            endTime:
              end,

            message:
              document.querySelector(
                '#pMessage'
              ).value.trim()

          });


          success.textContent =
            'Collaboration request sent. After approval, AFTR will email you and add it to Google Calendar. It will not be published publicly.';


          success.classList.add(
            'show'
          );


          collaborationForm.reset();


        } catch (
          error
        ) {

          success.textContent =
            'Could not submit: ' +
            error.message;


          success.classList.add(
            'show'
          );

        }

      }
    );

  }


  /* =======================================================
     PARTNER EVENTS
     ======================================================= */

  const eventForm =
    document.querySelector(
      '#partnerEventForm'
    );


  if (
    eventForm
  ) {

    eventForm.addEventListener(
      'submit',
      async event => {

        event.preventDefault();


        const success =
          document.querySelector(
            '#partnerEventSuccess'
          );


        try {

          const start =
            document.querySelector(
              '#peStart'
            ).value;


          const end =
            document.querySelector(
              '#peEnd'
            ).value;


          if (
            !start ||
            !end ||
            end <= start
          ) {

            throw new Error(
              'Please select a valid start and end time.'
            );

          }


          const images =
            await readImages();


          await post({

            action:
              'submit_event',

            requestGroup:
              'Partner With Us',

            requestType:
              'Events',

            title:
              document.querySelector(
                '#peTitle'
              ).value.trim(),

            name:
              document.querySelector(
                '#peOrg'
              ).value.trim(),

            phone:
              document.querySelector(
                '#pePhone'
              ).value.trim(),

            email:
              document.querySelector(
                '#peEmail'
              ).value.trim(),

            date:
              document.querySelector(
                '#peDate'
              ).value,

            startTime:
              start,

            endTime:
              end,

            price:
              document.querySelector(
                '#pePrice'
              ).value.trim(),

            about:
              document.querySelector(
                '#peAbout'
              ).value.trim(),

            images:
              images,

            sourcePage:
              'partner.html'

          });


          success.textContent =
            'Event request sent. After approval, it will be emailed, added to Google Calendar and published on Home + Events.';


          success.classList.add(
            'show'
          );


          eventForm.reset();


        } catch (
          error
        ) {

          success.textContent =
            'Could not submit: ' +
            error.message;


          success.classList.add(
            'show'
          );

        }

      }
    );

  }

})();