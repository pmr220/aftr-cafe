/* =========================================================
   AFTR — ALL DAY CAFE
   CLEAN BACKEND V2.1
  

   Google Sheet tabs:

   Requests
   Events
   Calendar
   Menus
   Settings

   PUBLIC:
   - Book a Space → Workshop
   - Partner With Us → Events

   PRIVATE:
   - Reserve a Table
   - Product Showcase
   - Brand Promotion
   - Collaboration

   Approval:
   Public:
   Email + Calendar + Events + Home

   Private:
   Email + Calendar

   IMPORTANT:
   This version normalizes Google Sheets Date/time objects
   before using them. That fixes the Calendar conversion issue.
   ========================================================= */


/* =========================================================
   CONFIG
   ========================================================= */

const CONFIG = {

  SHEET_ID:
    '1K7GcLsUDivo1sFOhphSx894ZcQ-0cGa0EUDF-YQxclE',

  MENU_FOLDER_ID:
    '14A0hz3ccRXsOLWD80VQ2uwHZpmgVDRQe',

  EVENT_PHOTOS_FOLDER_ID:
    '1RjBg47mvckA8hWcX_rxNJZy-DehHOW3Q',

  CALENDAR_ID:
    'd583b56ac0cd543583f9af6cdee3edd8231ea8bf589b370a9e9b80364205c7fd@group.calendar.google.com',

  TEAM_EMAIL:
    'parthrathi7@gmail.com',

  BUSINESS_NAME:
    'AFTR — All Day Cafe',

  TIMEZONE:
    'Asia/Kolkata'

};


/* =========================================================
   SHEET HEADERS
   ========================================================= */

const REQUEST_HEADERS = [

  'requestId',
  'createdAt',
  'requestGroup',
  'requestType',
  'status',
  'publicPublish',
  'title',
  'name',
  'phone',
  'email',
  'guests',
  'date',
  'startTime',
  'endTime',
  'price',
  'about',
  'imageUrls',
  'sourcePage',
  'calendarEventId',
  'publicEventId',
  'approvedAt',
  'rejectedAt',
  'adminNotes'

];


const EVENT_HEADERS = [

  'eventId',
  'requestId',
  'status',
  'title',
  'category',
  'date',
  'startTime',
  'endTime',
  'timeDisplay',
  'price',
  'about',
  'organizer',
  'phone',
  'email',
  'location',
  'imageUrls',
  'createdAt',
  'publishedAt',
  'calendarEventId'

];


const CALENDAR_HEADERS = [

  'calendarEntryId',
  'requestId',
  'requestType',
  'title',
  'date',
  'startTime',
  'endTime',
  'status',
  'googleEventId',
  'createdAt',
  'updatedAt'

];


const MENU_HEADERS = [

  'menuId',
  'title',
  'driveFileId',
  'fileUrl',
  'status',
  'uploadedAt',
  'updatedAt'

];


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function json_(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


function sheet_(name) {

  const spreadsheet =
    SpreadsheetApp.openById(
      CONFIG.SHEET_ID
    );

  const sheet =
    spreadsheet.getSheetByName(
      name
    );

  if (!sheet) {

    throw new Error(
      'Missing Google Sheet tab: ' +
      name
    );

  }

  return sheet;

}


function headers_(sheet) {

  const lastColumn =
    Math.max(
      1,
      sheet.getLastColumn()
    );

  return sheet
    .getRange(
      1,
      1,
      1,
      lastColumn
    )
    .getValues()[0]
    .map(String);

}


function ensureHeaders_(
  sheetName,
  requiredHeaders
) {

  const sheet =
    sheet_(
      sheetName
    );

  let headers =
    headers_(
      sheet
    );


  if (
    headers.every(
      value =>
        String(value).trim() === ''
    )
  ) {

    sheet
      .getRange(
        1,
        1,
        1,
        requiredHeaders.length
      )
      .setValues([
        requiredHeaders
      ]);

    return requiredHeaders;

  }


  requiredHeaders.forEach(
    required => {

      if (
        headers.indexOf(
          required
        ) === -1
      ) {

        sheet
          .getRange(
            1,
            headers.length + 1
          )
          .setValue(
            required
          );

        headers.push(
          required
        );

      }

    }
  );


  return headers;

}


function readObjects_(
  sheetName
) {

  const sheet =
    sheet_(
      sheetName
    );

  const values =
    sheet
      .getDataRange()
      .getValues();


  if (
    values.length < 2
  ) {

    return [];

  }


  const headers =
    values[0].map(String);


  return values
    .slice(1)
    .map(
      (row, index) => {

        const object = {

          _row:
            index + 2

        };


        headers.forEach(
          (
            header,
            column
          ) => {

            object[
              header
            ] =
              row[
                column
              ];

          }
        );


        return object;

      }
    );

}


function appendObject_(
  sheetName,
  object,
  requiredHeaders
) {

  const sheet =
    sheet_(
      sheetName
    );

  const headers =
    ensureHeaders_(
      sheetName,
      requiredHeaders
    );


  sheet.appendRow(

    headers.map(
      header =>
        object[
          header
        ] !== undefined
          ? object[
              header
            ]
          : ''
    )

  );

}


function updateObject_(
  sheetName,
  rowNumber,
  valuesObject,
  requiredHeaders
) {

  const sheet =
    sheet_(
      sheetName
    );

  const headers =
    ensureHeaders_(
      sheetName,
      requiredHeaders
    );


  const current =
    sheet
      .getRange(
        rowNumber,
        1,
        1,
        headers.length
      )
      .getValues()[0];


  const next =
    headers.map(
      (
        header,
        index
      ) => {

        if (
          Object.prototype
            .hasOwnProperty
            .call(
              valuesObject,
              header
            )
        ) {

          return valuesObject[
            header
          ];

        }


        return current[
          index
        ];

      }
    );


  sheet
    .getRange(
      rowNumber,
      1,
      1,
      headers.length
    )
    .setValues([
      next
    ]);

}


function clean_(
  value
) {

  return String(
    value == null
      ? ''
      : value
  );

}


function normal_(
  value
) {

  return String(
    value || ''
  )
    .trim()
    .toLowerCase();

}


/* =========================================================
   IMPORTANT DATE NORMALIZATION
   ========================================================= */

/*
   Google Sheets can return a date cell as a JavaScript Date
   object instead of "yyyy-MM-dd".

   Always convert it to the format our website expects.
*/

function normalizeDate_(
  value
) {

  if (
    value instanceof Date &&
    !isNaN(
      value.getTime()
    )
  ) {

    return Utilities.formatDate(
      value,
      CONFIG.TIMEZONE,
      'yyyy-MM-dd'
    );

  }


  const text =
    String(
      value || ''
    ).trim();


  if (!text) {
    return '';
  }


  /*
     Already correct.
  */

  if (
    /^\d{4}-\d{2}-\d{2}$/
      .test(text)
  ) {

    return text;

  }


  /*
     Common dd/MM/yyyy format.
  */

  let match =
    text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );


  if (match) {

    return (
      match[3] +
      '-' +
      String(
        match[2]
      ).padStart(
        2,
        '0'
      ) +
      '-' +
      String(
        match[1]
      ).padStart(
        2,
        '0'
      )
    );

  }


  /*
     Try parsing a normal date string.
  */

  const parsed =
    new Date(
      text
    );


  if (
    !isNaN(
      parsed.getTime()
    )
  ) {

    return Utilities.formatDate(
      parsed,
      CONFIG.TIMEZONE,
      'yyyy-MM-dd'
    );

  }


  return '';

}


/*
   Google Sheets can also return a time cell as a Date object.
   Convert it to HH:mm.
*/

function normalizeTime_(
  value
) {

  if (
    value instanceof Date &&
    !isNaN(
      value.getTime()
    )
  ) {

    return Utilities.formatDate(
      value,
      CONFIG.TIMEZONE,
      'HH:mm'
    );

  }


  const text =
    String(
      value || ''
    ).trim();


  if (!text) {
    return '';
  }


  /*
     Already HH:mm.
  */

  if (
    /^\d{1,2}:\d{2}$/
      .test(text)
  ) {

    const parts =
      text.split(':');


    return (
      String(
        Number(
          parts[0]
        )
      ).padStart(
        2,
        '0'
      ) +
      ':' +
      parts[1]
    );

  }


  /*
     9:00 AM / 7:30 PM
  */

  const ampm =
    text.match(
      /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
    );


  if (
    ampm
  ) {

    let hour =
      Number(
        ampm[1]
      );


    const minute =
      Number(
        ampm[2]
      );


    const suffix =
      ampm[3]
        .toUpperCase();


    if (
      suffix === 'PM' &&
      hour !== 12
    ) {

      hour += 12;

    }


    if (
      suffix === 'AM' &&
      hour === 12
    ) {

      hour = 0;

    }


    return (
      String(
        hour
      ).padStart(
        2,
        '0'
      ) +
      ':' +
      String(
        minute
      ).padStart(
        2,
        '0'
      )
    );

  }


  /*
     Try parsing a Date-like time.
  */

  const parsed =
    new Date(
      text
    );


  if (
    !isNaN(
      parsed.getTime()
    )
  ) {

    return Utilities.formatDate(
      parsed,
      CONFIG.TIMEZONE,
      'HH:mm'
    );

  }


  return '';

}


/*
   Convert yyyy-MM-dd + HH:mm to actual Date.
*/

function makeDateTime_(
  dateValue,
  timeValue
) {

  const date =
    normalizeDate_(
      dateValue
    );


  const time =
    normalizeTime_(
      timeValue
    );


  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(time)
  ) {

    return null;

  }


  try {

    /*
       IMPORTANT:
       Parse explicitly in the AFTR timezone instead of relying on
       the Apps Script project timezone or browser-style Date parsing.
       This prevents India date/time values from shifting when the
       Google Sheet cell was returned as a Date object.
    */

    const parsed =
      Utilities.parseDate(
        date + ' ' + time,
        CONFIG.TIMEZONE,
        'yyyy-MM-dd HH:mm'
      );


    if (
      !parsed ||
      isNaN(parsed.getTime())
    ) {

      return null;

    }


    return parsed;

  } catch (error) {

    console.log(
      'AFTR makeDateTime_ error: ' +
      error
    );

    return null;

  }

}


/*
   Used in emails and public event display.
*/

function formatTime_(
  value
) {

  const time =
    normalizeTime_(
      value
    );


  if (!time) {
    return '';
  }


  const parts =
    time.split(':');


  let hour =
    Number(
      parts[0]
    );


  const minute =
    parts[1];


  const suffix =
    hour >= 12
      ? 'PM'
      : 'AM';


  hour =
    hour % 12 ||
    12;


  return (
    hour +
    ':' +
    minute +
    ' ' +
    suffix
  );

}


function timeDisplay_(
  start,
  end
) {

  const startFormatted =
    formatTime_(
      start
    );


  const endFormatted =
    formatTime_(
      end
    );


  if (
    !startFormatted &&
    !endFormatted
  ) {

    return '';

  }


  return (
    startFormatted +
    ' — ' +
    endFormatted
  );

}


/* =========================================================
   REQUEST CLASSIFICATION
   ========================================================= */

function classifyRequest_(
  group,
  type
) {

  const requestGroup =
    String(
      group || ''
    ).trim();


  const requestType =
    String(
      type || ''
    ).trim();


  const publicPublish =
    (
      requestGroup ===
      'Book a Space' &&
      requestType ===
      'Workshop'
    )
    ||
    (
      requestGroup ===
      'Partner With Us' &&
      requestType ===
      'Events'
    );


  return {

    requestGroup:
      requestGroup,

    requestType:
      requestType,

    publicPublish:
      publicPublish

  };

}


/* =========================================================
   REQUEST NORMALIZATION
   ========================================================= */

function normalizedRequest_(
  request
) {

  return {

    ...request,

    requestId:
      clean_(
        request.requestId
      ),

    requestGroup:
      clean_(
        request.requestGroup
      ),

    requestType:
      clean_(
        request.requestType
      ),

    status:
      clean_(
        request.status
      ),

    publicPublish:
      String(
        request.publicPublish
      ).toLowerCase() ===
      'true',

    title:
      clean_(
        request.title
      ),

    name:
      clean_(
        request.name
      ),

    phone:
      clean_(
        request.phone
      ),

    email:
      clean_(
        request.email
      ),

    guests:
      clean_(
        request.guests
      ),

    /*
       THIS IS THE IMPORTANT FIX.
    */

    date:
      normalizeDate_(
        request.date
      ),

    startTime:
      normalizeTime_(
        request.startTime
      ),

    endTime:
      normalizeTime_(
        request.endTime
      ),

    price:
      clean_(
        request.price
      ),

    about:
      clean_(
        request.about
      ),

    imageUrls:
      clean_(
        request.imageUrls
      ),

    sourcePage:
      clean_(
        request.sourcePage
      ),

    calendarEventId:
      clean_(
        request.calendarEventId
      ),

    publicEventId:
      clean_(
        request.publicEventId
      ),

    adminNotes:
      clean_(
        request.adminNotes
      )

  };

}


/* =========================================================
   IMAGE SAVE
   ========================================================= */

function saveImage_(
  data
) {

  try {

    if (
      !data ||
      String(
        data
      ).indexOf(
        'data:image'
      ) !== 0
    ) {

      return '';

    }


    const match =
      String(
        data
      ).match(
        /^data:(image\/[^;]+);base64,(.*)$/
      );


    if (!match) {
      return '';
    }


    const blob =
      Utilities.newBlob(

        Utilities.base64Decode(
          match[2]
        ),

        match[1],

        'aftr-' +
        Date.now() +
        '.jpg'

      );


    const file =
      DriveApp
        .getFolderById(
          CONFIG.EVENT_PHOTOS_FOLDER_ID
        )
        .createFile(
          blob
        );


    file.setSharing(

      DriveApp.Access
        .ANYONE_WITH_LINK,

      DriveApp.Permission
        .VIEW

    );


    return (
      'https://drive.google.com/uc?export=view&id=' +
      file.getId()
    );


  } catch (
    error
  ) {

    console.log(
      'AFTR image error: ' +
      error
    );


    return '';

  }

}


/* =========================================================
   GET
   ========================================================= */

function readAction_(
  e, isAdmin
) {

  try {

    const action =
      e &&
      e.parameter
        ? e.parameter.action || ''
        : '';


    if (action === 'instagram_posts') return instagramList_();
    if (['admin_requests', 'admin_events'].indexOf(action) !== -1 && !isAdmin) {
      return unauthorized_();
    }

    /* -----------------------------------------------
       PUBLIC EVENTS
       ----------------------------------------------- */

    if (
      action ===
      'events'
    ) {

      const today =
        Utilities.formatDate(
          new Date(),
          CONFIG.TIMEZONE,
          'yyyy-MM-dd'
        );


      const events =
        readObjects_(
          'Events'
        )
          .map(
            normalizeEvent_
          )
          .filter(
            event =>
              normal_(
                event.status
              ) ===
              'published'
          )
          .filter(
            event =>
              event.date >=
              today
          )
          .sort(
            (a, b) =>
              a.date.localeCompare(
                b.date
              )
          );


      return json_({

        ok:
          true,

        events:
          events.map(
            publicEvent_
          )

      });

    }


    /* -----------------------------------------------
       ADMIN REQUESTS
       ONLY PENDING REQUESTS
       ----------------------------------------------- */

    if (
      action ===
      'admin_requests'
    ) {

      const requests =
        readObjects_(
          'Requests'
        )
          .map(
            normalizedRequest_
          )
          .filter(
            request =>
              normal_(
                request.status
              ) ===
              'pending'
          )
          .sort(
            (a, b) =>
              String(
                b.createdAt
              ).localeCompare(
                String(
                  a.createdAt
                )
              )
          );


      return json_({

        ok:
          true,

        requests:
          requests.map(
            adminRequest_
          )

      });

    }


    /* -----------------------------------------------
       ALL PUBLIC EVENT RECORDS FOR ADMIN
       ----------------------------------------------- */

    if (
      action ===
      'admin_events'
    ) {

      return json_({

        ok:
          true,

        events:
          readObjects_(
            'Events'
          )
            .map(
              normalizeEvent_
            )
            .map(
              publicEvent_
            )

      });

    }


    /* -----------------------------------------------
       CALENDAR
       ----------------------------------------------- */

    if (
      action ===
      'availability'
    ) {

      return json_({

        ok:
          true,

        blocks:
          readObjects_(
            'Calendar'
          )
            .filter(
              row =>
                normal_(
                  row.status
                ) ===
                'active'
            )
            .map(
              item => {
                const block = calendarBlock_(item);
                return isAdmin ? block : { date: block.date, start: block.start, end: block.end, status: block.status, note: 'Unavailable' };
              }
            )

      });

    }


    /* -----------------------------------------------
       MENUS
       ----------------------------------------------- */

    if (
      action ===
      'menu'
    ) {

      return json_({

        ok:
          true,

        menus:
          readObjects_(
            'Menus'
          )
            .filter(
              row =>
                normal_(
                  row.status
                ) ===
                'active'
            )
            .map(
              menu_
            )

      });

    }


    return json_({

      ok:
        true,

      service:
        'AFTR unified backend v2.1'

    });


  } catch (
    error
  ) {

    console.log(
      'AFTR doGet error: ' +
      error
    );


    return json_({

      ok:
        false,

      error:
        String(
          error
        )

    });

  }

}


/* =========================================================
   EVENT NORMALIZATION
   ========================================================= */

function normalizeEvent_(
  event
) {

  return {

    ...event,

    eventId:
      clean_(
        event.eventId
      ),

    requestId:
      clean_(
        event.requestId
      ),

    status:
      clean_(
        event.status
      ),

    title:
      clean_(
        event.title
      ),

    category:
      clean_(
        event.category
      ),

    date:
      normalizeDate_(
        event.date
      ),

    startTime:
      normalizeTime_(
        event.startTime
      ),

    endTime:
      normalizeTime_(
        event.endTime
      ),

    timeDisplay:
      clean_(
        event.timeDisplay
      ) ||
      timeDisplay_(
        event.startTime,
        event.endTime
      ),

    price:
      clean_(
        event.price
      ),

    about:
      clean_(
        event.about
      ),

    organizer:
      clean_(
        event.organizer
      ),

    phone:
      clean_(
        event.phone
      ),

    email:
      clean_(
        event.email
      ),

    location:
      clean_(
        event.location ||
        CONFIG.BUSINESS_NAME
      ),

    imageUrls:
      clean_(
        event.imageUrls
      )

  };

}


/* =========================================================
   ADMIN REQUEST FORMAT
   ========================================================= */

function adminRequest_(
  request
) {

  const normalized =
    normalizedRequest_(
      request
    );


  return {

    id:
      normalized.requestId,

    createdAt:
      clean_(
        normalized.createdAt
      ),

    requestGroup:
      normalized.requestGroup,

    requestType:
      normalized.requestType,

    status:
      normalized.status,

    publicPublish:
      normalized.publicPublish,

    title:
      normalized.title,

    name:
      normalized.name,

    phone:
      normalized.phone,

    email:
      normalized.email,

    guests:
      normalized.guests,

    date:
      normalized.date,

    /*
       ADMIN FORM WILL NOW RECEIVE HH:mm,
       NOT A GOOGLE SHEETS DATE STRING.
    */

    startTime:
      normalized.startTime,

    endTime:
      normalized.endTime,

    price:
      normalized.price,

    about:
      normalized.about,

    imageUrls:
      normalized.imageUrls,

    sourcePage:
      normalized.sourcePage,

    calendarEventId:
      normalized.calendarEventId,

    publicEventId:
      normalized.publicEventId,

    adminNotes:
      normalized.adminNotes

  };

}


/* =========================================================
   PUBLIC EVENT FORMAT
   ========================================================= */

function publicEvent_(
  event
) {

  return {

    id:
      event.eventId,

    requestId:
      event.requestId,

    status:
      event.status,

    title:
      event.title,

    category:
      event.category,

    date:
      event.date,

    time:
      event.timeDisplay ||
      timeDisplay_(
        event.startTime,
        event.endTime
      ),

    startTime:
      event.startTime,

    endTime:
      event.endTime,

    price:
      event.price,

    about:
      event.about,

    organizer:
      event.organizer,

    phone:
      event.phone,

    email:
      event.email,

    location:
      event.location,

    image:
      event.imageUrls

  };

}


/* =========================================================
   CALENDAR FORMAT
   ========================================================= */

function calendarBlock_(
  item
) {

  return {

    id:
      clean_(
        item.calendarEntryId
      ),

    requestId:
      clean_(
        item.requestId
      ),

    type:
      clean_(
        item.requestType
      ),

    date:
      normalizeDate_(
        item.date
      ),

    start:
      normalizeTime_(
        item.startTime
      ),

    end:
      normalizeTime_(
        item.endTime
      ),

    note:
      clean_(
        item.title
      ),

    status:
      clean_(
        item.status
      )

  };

}


/* =========================================================
   MENU FORMAT
   ========================================================= */

function menu_(
  item
) {

  return {

    id:
      clean_(
        item.menuId
      ),

    title:
      clean_(
        item.title
      ),

    url:
      clean_(
        item.fileUrl
      ),

    uploadedAt:
      clean_(
        item.updatedAt ||
        item.uploadedAt
      )

  };

}


/* =========================================================
   POST ROUTER
   ========================================================= */

function doPost(
  e
) {

  try {

    const data =
      JSON.parse(
        e.postData.contents ||
        '{}'
      );


    const publicActions = ['submit_event', 'booking', 'collaboration'];
    if (data.action === 'submission_receipt') {
      if (!/^REQ-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(data.requestId))) throw new Error('Invalid reference.');
      return json_({ ok: true, received: !!findRequest_(data.requestId) });
    }
    if (publicActions.indexOf(data.action) !== -1 && data.requestId) {
      return submitOnce_(data);
    }
    if (publicActions.indexOf(data.action) === -1) {
      if (!verifyAdminToken_(data.adminToken)) return unauthorized_();
      if (data.action === 'admin_request_status') {
        const saved = findRequest_(String(data.id || ''));
        return json_({ ok: true, status: saved ? saved.status : 'Unknown' });
      }
      if (data.action === 'approve_request') {
        const approvalLock = LockService.getScriptLock();
        if (!approvalLock.tryLock(10000)) throw new Error('An update is in progress. Check the request status shortly.');
        try { return approveRequest_(data); } finally { approvalLock.releaseLock(); }
      }
      if (data.action === 'save_instagram_post') return instagramSave_(data);
      if (data.action === 'delete_instagram_post') return instagramDelete_(data);
      if (['admin_requests', 'admin_events', 'admin_availability', 'menu'].indexOf(data.action) !== -1) {
        return readAction_({ parameter: { action: data.action === 'admin_availability' ? 'availability' : data.action } }, true);
      }
    }

    switch (
      data.action
    ) {

      case 'submit_event':
        return submitEvent_(
          data
        );


      case 'booking':
        return submitTable_(
          data
        );


      case 'collaboration':
        return submitCollaboration_(
          data
        );


      case 'update_request':
        return updateRequest_(
          data
        );


      case 'approve_request':
        return approveRequest_(
          data
        );


      case 'reject_request':
        return rejectRequest_(
          data
        );


      case 'save_event':
        return saveEvent_(
          data
        );


      case 'unpublish_event':
        return unpublishEvent_(
          data
        );


      case 'block_slot':
        return blockSlot_(
          data
        );


      case 'save_menu_pdf':
        return saveMenuPdf_(
          data
        );


      case 'delete_menu_pdf':
        return deleteMenuPdf_(
          data
        );


      default:

        return json_({

          ok:
            false,

          error:
            'Unknown action: ' +
            (
              data.action ||
              ''
            )

        });

    }


  } catch (
    error
  ) {

    console.log(
      'AFTR doPost error: ' +
      error
    );


    return json_({

      ok:
        false,

      error:
        String(
          error
        )

    });

  }

}


/* =========================================================
   BOOK A SPACE
   ========================================================= */

function submitEvent_(
  data
) {

  const classification =
    classifyRequest_(
      data.requestGroup ||
      'Book a Space',

      data.requestType ||
      data.type ||
      'Workshop'
    );


  const requestId =
    data.requestId ||
    data.id ||
    (
      'REQ-' +
      Date.now()
    );


  let imageUrls =
    '';


  if (
    Array.isArray(
      data.images
    )
  ) {

    imageUrls =
      data.images
        .slice(
          0,
          4
        )
        .map(
          saveImage_
        )
        .filter(Boolean)
        .join(
          ' | '
        );

  }


  createRequest_({

    requestId:
      requestId,

    requestGroup:
      classification.requestGroup,

    requestType:
      classification.requestType,

    publicPublish:
      classification.publicPublish,

    title:
      data.title ||
      '',

    name:
      data.name ||
      '',

    phone:
      data.phone ||
      '',

    email:
      data.email ||
      '',

    guests:
      data.guests ||
      '',

    date:
      normalizeDate_(
        data.date
      ),

    startTime:
      normalizeTime_(
        data.startTime ||
        data.start
      ),

    endTime:
      normalizeTime_(
        data.endTime ||
        data.end
      ),

    price:
      data.price ||
      '',

    about:
      data.about ||
      '',

    imageUrls:
      imageUrls,

    sourcePage:
      data.sourcePage ||
      'book.html'

  });


  sendNewRequestEmail_({
    requestId:
      requestId,

    requestGroup:
      classification.requestGroup,

    requestType:
      classification.requestType,

    title:
      data.title,

    name:
      data.name,

    phone:
      data.phone,

    email:
      data.email,

    date:
      normalizeDate_(
        data.date
      ),

    startTime:
      normalizeTime_(
        data.startTime ||
        data.start
      ),

    endTime:
      normalizeTime_(
        data.endTime ||
        data.end
      ),

    about:
      data.about

  });


  return json_({

    ok:
      true,

    requestId:
      requestId,

    publicPublish:
      classification.publicPublish

  });

}


/* =========================================================
   TABLE
   ========================================================= */

function submitTable_(
  data
) {

  const requestId =
    data.requestId ||
    data.id ||
    (
      'REQ-' +
      Date.now()
    );


  createRequest_({

    requestId:
      requestId,

    requestGroup:
      'Table Reservations',

    requestType:
      'Reserve a Table',

    publicPublish:
      false,

    title:
      'Table reservation — ' +
      (
        data.name ||
        ''
      ),

    name:
      data.name ||
      '',

    phone:
      data.phone ||
      '',

    email:
      data.email ||
      '',

    guests:
      data.guests ||
      '',

    date:
      normalizeDate_(
        data.date
      ),

    startTime:
      normalizeTime_(
        data.startTime ||
        data.start
      ),

    endTime:
      normalizeTime_(
        data.endTime ||
        data.end
      ),

    price:
      '',

    about:
      data.message ||
      '',

    imageUrls:
      '',

    sourcePage:
      'reserve.html'

  });


  sendNewRequestEmail_({

    requestId:
      requestId,

    requestGroup:
      'Table Reservations',

    requestType:
      'Reserve a Table',

    title:
      'Table reservation',

    name:
      data.name,

    phone:
      data.phone,

    email:
      data.email,

    date:
      normalizeDate_(
        data.date
      ),

    startTime:
      normalizeTime_(
        data.startTime ||
        data.start
      ),

    endTime:
      normalizeTime_(
        data.endTime ||
        data.end
      ),

    about:
      data.message ||
      ''

  });


  return json_({

    ok:
      true,

    requestId:
      requestId

  });

}


/* =========================================================
   COLLABORATION
   ========================================================= */

function submitCollaboration_(
  data
) {

  const requestId =
    data.requestId ||
    data.id ||
    (
      'REQ-' +
      Date.now()
    );


  const about =
    (
      data.collaborationType
        ? (
            data.collaborationType +
            '\n\n'
          )
        : ''
    ) +
    (
      data.message ||
      ''
    );


  createRequest_({

    requestId:
      requestId,

    requestGroup:
      'Partner With Us',

    requestType:
      'Collaboration',

    publicPublish:
      false,

    title:
      'Collaboration — ' +
      (
        data.name ||
        ''
      ),

    name:
      data.name ||
      '',

    phone:
      data.phone ||
      '',

    email:
      data.email ||
      '',

    guests:
      '',

    date:
      normalizeDate_(
        data.date
      ),

    startTime:
      normalizeTime_(
        data.startTime ||
        data.start
      ),

    endTime:
      normalizeTime_(
        data.endTime ||
        data.end
      ),

    price:
      '',

    about:
      about,

    imageUrls:
      '',

    sourcePage:
      'partner.html'

  });


  sendNewRequestEmail_({

    requestId:
      requestId,

    requestGroup:
      'Partner With Us',

    requestType:
      'Collaboration',

    title:
      'Collaboration',

    name:
      data.name,

    phone:
      data.phone,

    email:
      data.email,

    date:
      normalizeDate_(
        data.date
      ),

    startTime:
      normalizeTime_(
        data.startTime ||
        data.start
      ),

    endTime:
      normalizeTime_(
        data.endTime ||
        data.end
      ),

    about:
      about

  });


  return json_({

    ok:
      true,

    requestId:
      requestId

  });

}


/* =========================================================
   CREATE REQUEST
   ========================================================= */

function createRequest_(
  data
) {

  ensureHeaders_(
    'Requests',
    REQUEST_HEADERS
  );


  appendObject_(
    'Requests',
    {

      requestId:
        data.requestId,

      createdAt:
        new Date(),

      requestGroup:
        data.requestGroup,

      requestType:
        data.requestType,

      status:
        'Pending',

      publicPublish:
        data.publicPublish
          ? 'TRUE'
          : 'FALSE',

      title:
        data.title,

      name:
        data.name,

      phone:
        data.phone,

      email:
        data.email,

      guests:
        data.guests,

      date:
        normalizeDate_(
          data.date
        ),

      startTime:
        normalizeTime_(
          data.startTime
        ),

      endTime:
        normalizeTime_(
          data.endTime
        ),

      price:
        data.price,

      about:
        data.about,

      imageUrls:
        data.imageUrls,

      sourcePage:
        data.sourcePage,

      calendarEventId:
        '',

      publicEventId:
        '',

      approvedAt:
        '',

      rejectedAt:
        '',

      adminNotes:
        ''

    },

    REQUEST_HEADERS
  );

}


/* =========================================================
   NEW REQUEST EMAIL
   ========================================================= */

function sendNewRequestEmail_(
  data
) {

  try {

    MailApp.sendEmail(

      CONFIG.TEAM_EMAIL,

      'AFTR request — ' +
      (
        data.requestType ||
        ''
      ),

      'New AFTR request\n\n' +

      'Request ID: ' +
      (
        data.requestId ||
        ''
      ) +

      '\nGroup: ' +
      (
        data.requestGroup ||
        ''
      ) +

      '\nType: ' +
      (
        data.requestType ||
        ''
      ) +

      '\nTitle: ' +
      (
        data.title ||
        ''
      ) +

      '\nName: ' +
      (
        data.name ||
        ''
      ) +

      '\nWhatsApp: ' +
      (
        data.phone ||
        ''
      ) +

      '\nEmail: ' +
      (
        data.email ||
        ''
      ) +

      '\nDate: ' +
      (
        data.date ||
        ''
      ) +

      '\nTime: ' +
      timeDisplay_(
        data.startTime,
        data.endTime
      ) +

      '\n\nDetails:\n' +
      (
        data.about ||
        ''
      )

    );

  } catch (
    error
  ) {

    console.log(
      'AFTR email error: ' +
      error
    );

  }

}


/* =========================================================
   FIND REQUEST
   ========================================================= */

function findRequest_(
  id
) {

  const rows =
    readObjects_(
      'Requests'
    );


  const found =
    rows.find(
      row =>
        String(
          row.requestId
        ) ===
        String(
          id
        )
    );


  if (
    !found
  ) {
    return null;
  }


  return normalizedRequest_(
    found
  );

}


/* =========================================================
   UPDATE REQUEST
   ========================================================= */

function updateRequest_(
  data
) {

  const rows =
    readObjects_(
      'Requests'
    );


  const request =
    rows.find(
      row =>
        String(
          row.requestId
        ) ===
        String(
          data.id ||
          data.requestId
        )
    );


  if (
    !request
  ) {

    return json_({

      ok:
        false,

      error:
        'Request not found.'

    });

  }


  /*
     Store clean text values in the Sheet.
     This also prevents future Google Sheets
     auto-conversion problems.
  */

  const date =
    normalizeDate_(
      data.date
    );


  const startTime =
    normalizeTime_(
      data.startTime ||
      data.start
    );


  const endTime =
    normalizeTime_(
      data.endTime ||
      data.end
    );


  updateObject_(
    'Requests',
    request._row,
    {

      title:
        data.title ||
        '',

      name:
        data.name ||
        '',

      phone:
        data.phone ||
        '',

      email:
        data.email ||
        '',

      guests:
        data.guests ||
        '',

      date:
        date,

      startTime:
        startTime,

      endTime:
        endTime,

      price:
        data.price ||
        '',

      about:
        data.about ||
        data.message ||
        '',

      adminNotes:
        data.adminNotes ||
        ''

    },

    REQUEST_HEADERS
  );


  return json_({

    ok:
      true,

    saved: {

      date:
        date,

      startTime:
        startTime,

      endTime:
        endTime

    }

  });

}


/* =========================================================
   APPROVE REQUEST
   ========================================================= */

function approveRequest_(
  data
) {

  const request =
    findRequest_(
      (data.id || data.requestId)
    );


  if (
    !request
  ) {

    return json_({

      ok:
        false,

      error:
        'Request not found.'

    });

  }


  if (
    normal_(
      request.status
    ) !==
    'pending'
  ) {

    return json_({

      ok:
        false,

      error:
        'This request has already been processed.'

    });

  }


  /*
     NORMALIZE AGAIN.
     This is the fix for Google Sheets Date objects.
  */

  const date =
    normalizeDate_(
      request.date
    );


  const startTime =
    normalizeTime_(
      request.startTime
    );


  const endTime =
    normalizeTime_(
      request.endTime
    );


  console.log(
    'AFTR approval normalized:',
    JSON.stringify({

      id:
        request.requestId,

      date:
        date,

      startTime:
        startTime,

      endTime:
        endTime

    })

  );


  if (
    !date ||
    !startTime ||
    !endTime
  ) {

    return json_({

      ok:
        false,

      error:
        'The request has a missing date, start time or end time. The stored values were: date=' +
        date +
        ', start=' +
        startTime +
        ', end=' +
        endTime

    });

  }


  const start =
    makeDateTime_(
      date,
      startTime
    );


  const end =
    makeDateTime_(
      date,
      endTime
    );


  if (
    !start ||
    !end
  ) {

    return json_({

      ok:
        false,

      error:
        'The date or time could not be converted into a valid Google Calendar time. Received date=' +
        date +
        ', start=' +
        startTime +
        ', end=' +
        endTime

    });

  }


  if (
    end <= start
  ) {

    return json_({

      ok:
        false,

      error:
        'End time must be after start time.'

    });

  }


  /*
     Create Calendar event.
  */

  let calendarEventId = '';


  try {

    calendarEventId =
      createOrUpdateCalendar_({

        ...request,

        date:
          date,

        startTime:
          startTime,

        endTime:
          endTime

      });

  } catch (
    calendarError
  ) {

    console.log(
      'AFTR Calendar approval error: ' +
      calendarError
    );


    return json_({

      ok:
        false,

      error:
        'Google Calendar could not be updated: ' +
        String(
          calendarError
        )

    });

  }


  const isPublic =
    request.publicPublish ===
    true;


  let publicEventId =
    '';


  /*
     ONLY public request types
     become website events.
  */

  if (
    isPublic
  ) {

    publicEventId =
      createOrUpdatePublicEvent_({

        ...request,

        date:
          date,

        startTime:
          startTime,

        endTime:
          endTime

      }, calendarEventId);

  }


  /*
     Update request AFTER all required actions succeed.
  */

  updateObject_(
    'Requests',
    request._row,
    {

      status:
        'Approved',

      calendarEventId:
        calendarEventId,

      publicEventId:
        publicEventId,

      approvedAt:
        new Date(),

      rejectedAt:
        ''

    },

    REQUEST_HEADERS
  );


  sendApprovalEmail_({

    ...request,

    date:
      date,

    startTime:
      startTime,

    endTime:
      endTime

  }, isPublic);


  return json_({

    ok:
      true,

    approved:
      true,

    public:
      isPublic,

    calendarEventId:
      calendarEventId,

    publicEventId:
      publicEventId

  });

}


/* =========================================================
   GOOGLE CALENDAR
   ========================================================= */

function createOrUpdateCalendar_(
  request
) {

  const calendar =
    CalendarApp.getCalendarById(
      CONFIG.CALENDAR_ID
    );


  if (
    !calendar
  ) {

    throw new Error(
      'Calendar ID could not be opened.'
    );

  }


  const date =
    normalizeDate_(
      request.date
    );


  const startTime =
    normalizeTime_(
      request.startTime
    );


  const endTime =
    normalizeTime_(
      request.endTime
    );


  const start =
    makeDateTime_(
      date,
      startTime
    );


  const end =
    makeDateTime_(
      date,
      endTime
    );


  if (
    !start ||
    !end
  ) {

    throw new Error(
      'Invalid Calendar date/time. date=' +
      date +
      ', start=' +
      startTime +
      ', end=' +
      endTime
    );

  }


  const marker =
    '[AFTR_REQUEST_ID:' +
    request.requestId +
    ']';


  const title =
    'AFTR — ' +
    (
      request.title ||
      request.requestType
    );


  const description =

    marker +

    '\n\nRequest group: ' +
    (
      request.requestGroup ||
      ''
    ) +

    '\nRequest type: ' +
    (
      request.requestType ||
      ''
    ) +

    '\nName: ' +
    (
      request.name ||
      ''
    ) +

    '\nWhatsApp: ' +
    (
      request.phone ||
      ''
    ) +

    '\nEmail: ' +
    (
      request.email ||
      ''
    ) +

    '\nGuests: ' +
    (
      request.guests ||
      ''
    ) +

    '\nPrice: ' +
    (
      request.price ||
      ''
    ) +

    '\n\nDetails:\n' +
    (
      request.about ||
      ''
    );


  ensureHeaders_(
    'Calendar',
    CALENDAR_HEADERS
  );


  const calendarRows =
    readObjects_(
      'Calendar'
    );


  const existingRow =
    calendarRows.find(
      row =>
        String(
          row.requestId
        ) ===
        String(
          request.requestId
        )
    );


  let googleEvent =
    null;


  if (
    existingRow &&
    existingRow.googleEventId
  ) {

    try {

      googleEvent =
        calendar.getEventById(
          String(
            existingRow.googleEventId
          )
        );

    } catch (
      error
    ) {

      googleEvent =
        null;

    }

  }


  if (
    !googleEvent
  ) {

    const nearby =
      calendar.getEvents(
        new Date(
          start.getTime() -
          86400000
        ),

        new Date(
          end.getTime() +
          86400000
        )
      );


    googleEvent =
      nearby.find(
        event =>
          String(
            event.getDescription() ||
            ''
          ).indexOf(
            marker
          ) !== -1
      ) ||
      null;

  }


  if (
    googleEvent
  ) {

    googleEvent.setTitle(
      title
    );

    googleEvent.setTime(
      start,
      end
    );

    googleEvent.setDescription(
      description
    );

    googleEvent.setLocation(
      CONFIG.BUSINESS_NAME
    );

  } else {

    googleEvent =
      calendar.createEvent(
        title,
        start,
        end,
        {

          description:
            description,

          location:
            CONFIG.BUSINESS_NAME

        }
      );

  }


  const googleEventId =
    googleEvent.getId();


  if (
    existingRow
  ) {

    updateObject_(
      'Calendar',
      existingRow._row,
      {

        requestType:
          request.requestType,

        title:
          request.title ||
          request.requestType,

        date:
          date,

        startTime:
          startTime,

        endTime:
          endTime,

        status:
          'Active',

        googleEventId:
          googleEventId,

        updatedAt:
          new Date()

      },

      CALENDAR_HEADERS
    );

  } else {

    appendObject_(
      'Calendar',
      {

        calendarEntryId:
          'CAL-' +
          request.requestId,

        requestId:
          request.requestId,

        requestType:
          request.requestType,

        title:
          request.title ||
          request.requestType,

        date:
          date,

        startTime:
          startTime,

        endTime:
          endTime,

        status:
          'Active',

        googleEventId:
          googleEventId,

        createdAt:
          new Date(),

        updatedAt:
          new Date()

      },

      CALENDAR_HEADERS
    );

  }


  return googleEventId;

}


/* =========================================================
   PUBLIC EVENT
   ========================================================= */

function createOrUpdatePublicEvent_(
  request,
  calendarEventId
) {

  ensureHeaders_(
    'Events',
    EVENT_HEADERS
  );


  const rows =
    readObjects_(
      'Events'
    );


  const existing =
    rows.find(
      event =>
        String(
          event.requestId
        ) ===
        String(
          request.requestId
        )
    );


  const eventId =
    existing
      ? existing.eventId
      : (
          'EVT-' +
          request.requestId
        );


  const values = {

    eventId:
      eventId,

    requestId:
      request.requestId,

    status:
      'Published',

    title:
      request.title ||
      request.requestType,

    category:
      request.requestGroup +
      ' — ' +
      request.requestType,

    date:
      normalizeDate_(
        request.date
      ),

    startTime:
      normalizeTime_(
        request.startTime
      ),

    endTime:
      normalizeTime_(
        request.endTime
      ),

    timeDisplay:
      timeDisplay_(
        request.startTime,
        request.endTime
      ),

    price:
      request.price ||
      '',

    about:
      request.about ||
      '',

    organizer:
      request.name ||
      '',

    phone:
      request.phone ||
      '',

    email:
      request.email ||
      '',

    location:
      CONFIG.BUSINESS_NAME,

    imageUrls:
      request.imageUrls ||
      '',

    publishedAt:
      new Date(),

    calendarEventId:
      calendarEventId

  };


  if (
    existing
  ) {

    updateObject_(
      'Events',
      existing._row,
      values,
      EVENT_HEADERS
    );

  } else {

    appendObject_(
      'Events',
      {

        ...values,

        createdAt:
          new Date()

      },

      EVENT_HEADERS

    );

  }


  return eventId;

}


/* =========================================================
   APPROVAL EMAIL
   ========================================================= */

function sendApprovalEmail_(
  request,
  isPublic
) {

  if (
    !request.email
  ) {
    return;
  }


  const body =

    'Hello ' +
    (
      request.name ||
      'there'
    ) +
    ',\n\n' +

    'Thank you for choosing AFTR. We are pleased to confirm that your request has been approved.\n\n' +

    'YOUR BOOKING DETAILS\n' +

    'Type: ' +
    (request.requestType === 'Reserve a Table' ? 'Table Reservation' :
      [request.requestGroup, request.requestType].filter(Boolean).join(' — ')) +

    (request.requestType === 'Reserve a Table' && request.guests ? '\nNumber of guests: ' + request.guests : '') +

    '\nDate: ' +
    (
      normalizeDate_(
        request.date
      ) ||
      ''
    ) +

    '\nTime: ' +
    timeDisplay_(
      request.startTime,
      request.endTime
    ) +

    ' (IST)' +

    (request.title ? '\nBooking: ' + request.title : '') +
    (request.requestId ? '\nReference: ' + request.requestId : '') +

    '\n\nIf you need to make any changes, please contact the AFTR team before your scheduled visit.' +
    '\n\nWe look forward to welcoming you.' +
    '\n\nWarm regards,\nTeam AFTR\nAll Day Cafe';


  try {

    MailApp.sendEmail(

      request.email,

      'AFTR — Your booking request is approved',

      body

    );

  } catch (
    error
  ) {

    console.log(
      'AFTR approval email error: ' +
      error
    );

  }

}


/* =========================================================
   REJECT
   ========================================================= */

function rejectRequest_(
  data
) {

  const request =
    findRequest_(
      (data.id || data.requestId)
    );


  if (
    !request
  ) {

    return json_({

      ok:
        false,

      error:
        'Request not found.'

    });

  }


  cancelCalendarForRequest_(
    request
  );


  /*
     If a public event somehow exists,
     remove it from the public table.
  */

  if (
    request.publicEventId
  ) {

    unpublishPublicEvent_(
      request.publicEventId
    );

  }


  updateObject_(
    'Requests',
    request._row,
    {

      status:
        'Rejected',

      rejectedAt:
        new Date()

    },

    REQUEST_HEADERS
  );


  return json_({

    ok:
      true,

    rejected:
      true

  });

}


/* =========================================================
   CANCEL CALENDAR
   ========================================================= */

function cancelCalendarForRequest_(
  request
) {

  const calendar =
    CalendarApp.getCalendarById(
      CONFIG.CALENDAR_ID
    );


  if (
    !calendar
  ) {
    return;
  }


  const rows =
    readObjects_(
      'Calendar'
    );


  const row =
    rows.find(
      item =>
        String(
          item.requestId
        ) ===
        String(
          request.requestId
        )
    );


  if (
    row &&
    row.googleEventId
  ) {

    try {

      const event =
        calendar.getEventById(
          String(
            row.googleEventId
          )
        );


      if (
        event
      ) {

        event.deleteEvent();

      }

    } catch (
      error
    ) {

      console.log(
        'AFTR Calendar delete error: ' +
        error
      );

    }

  }


  if (
    row
  ) {

    updateObject_(
      'Calendar',
      row._row,
      {

        status:
          'Cancelled',

        updatedAt:
          new Date()

      },

      CALENDAR_HEADERS
    );

  }

}


/* =========================================================
   SAVE / EDIT PUBLIC EVENT
   ========================================================= */

function saveEvent_(
  data
) {

  const rows =
    readObjects_(
      'Events'
    );


  const event =
    rows.find(
      item =>
        String(
          item.eventId
        ) ===
        String(
          data.id ||
          data.eventId
        )
    );


  if (
    !event
  ) {

    return json_({

      ok:
        false,

      error:
        'Public event not found.'

    });

  }


  const date =
    normalizeDate_(
      data.date
    );


  const startTime =
    normalizeTime_(
      data.startTime
    );


  const endTime =
    normalizeTime_(
      data.endTime
    );


  if (
    !date ||
    !startTime ||
    !endTime
  ) {

    return json_({

      ok:
        false,

      error:
        'The public event has an invalid date or time.'

    });

  }


  const request =
    event.requestId
      ? findRequest_(
          event.requestId
        )
      : null;


  updateObject_(
    'Events',
    event._row,
    {

      status:
        data.status ||
        'Published',

      title:
        data.title ||
        event.title,

      category:
        data.category ||
        event.category,

      date:
        date,

      startTime:
        startTime,

      endTime:
        endTime,

      timeDisplay:
        timeDisplay_(
          startTime,
          endTime
        ),

      price:
        data.price ||
        '',

      about:
        data.about ||
        '',

      organizer:
        data.organizer ||
        '',

      phone:
        data.phone ||
        '',

      email:
        data.email ||
        ''

    },

    EVENT_HEADERS
  );


  if (
    request
  ) {

    const updatedRequest = {

      ...request,

      date:
        date,

      startTime:
        startTime,

      endTime:
        endTime,

      title:
        data.title ||
        request.title,

      price:
        data.price ||
        request.price,

      about:
        data.about ||
        request.about,

      name:
        data.organizer ||
        request.name,

      phone:
        data.phone ||
        request.phone,

      email:
        data.email ||
        request.email

    };


    if (
      normal_(
        data.status ||
        'Published'
      ) ===
      'published'
    ) {

      createOrUpdateCalendar_(
        updatedRequest
      );

    }

  }


  return json_({
    ok:
      true
  });

}


/* =========================================================
   UNPUBLISH
   ========================================================= */

function unpublishEvent_(
  data
) {

  const rows =
    readObjects_(
      'Events'
    );


  const event =
    rows.find(
      item =>
        String(
          item.eventId
        ) ===
        String(
          data.id
        )
    );


  if (
    !event
  ) {

    return json_({

      ok:
        false,

      error:
        'Event not found.'

    });

  }


  updateObject_(
    'Events',
    event._row,
    {

      status:
        'Unpublished'

    },

    EVENT_HEADERS
  );


  /*
     Keep Calendar booking because the admin
     may still want the time blocked, unless
     the request itself is rejected.
  */

  return json_({
    ok:
      true
  });

}


/* =========================================================
   MANUAL CALENDAR BLOCK
   ========================================================= */

function blockSlot_(
  data
) {

  const calendar =
    CalendarApp.getCalendarById(
      CONFIG.CALENDAR_ID
    );


  if (
    !calendar
  ) {

    throw new Error(
      'Google Calendar could not be opened.'
    );

  }


  const start =
    makeDateTime_(
      data.date,
      data.start
    );


  const end =
    makeDateTime_(
      data.date,
      data.end
    );


  if (
    !start ||
    !end ||
    end <= start
  ) {

    throw new Error(
      'Invalid manual block date or time.'
    );

  }


  const id =
    data.id ||
    (
      'CAL-' +
      Date.now()
    );


  if (
    normal_(
      data.status
    ) ===
    'cancelled'
  ) {

    const rows =
      readObjects_(
        'Calendar'
      );


    const row =
      rows.find(
        item =>
          String(
            item.calendarEntryId
          ) ===
          String(
            id
          )
      );


    if (
      row
    ) {

      updateObject_(
        'Calendar',
        row._row,
        {

          status:
            'Cancelled',

          updatedAt:
            new Date()

        },

        CALENDAR_HEADERS
      );

    }


    return json_({
      ok:
        true
    });

  }


  const googleEvent =
    calendar.createEvent(

      'AFTR — ' +
      (
        data.note ||
        'Manual booking'
      ),

      start,
      end,

      {

        description:
          '[AFTR_MANUAL_BLOCK:' +
          id +
          ']',

        location:
          CONFIG.BUSINESS_NAME

      }

    );


  appendObject_(
    'Calendar',
    {

      calendarEntryId:
        id,

      requestId:
        '',

      requestType:
        data.type ||
        'Manual',

      title:
        data.note ||
        'Manual booking',

      date:
        normalizeDate_(
          data.date
        ),

      startTime:
        normalizeTime_(
          data.start
        ),

      endTime:
        normalizeTime_(
          data.end
        ),

      status:
        'Active',

      googleEventId:
        googleEvent.getId(),

      createdAt:
        new Date(),

      updatedAt:
        new Date()

    },

    CALENDAR_HEADERS
  );


  return json_({
    ok:
      true
  });

}


/* =========================================================
   MENU PDF
   ========================================================= */

function saveMenuPdf_(
  data
) {

  if (
    !data.title
  ) {

    throw new Error(
      'Menu title is required.'
    );

  }


  if (
    !data.data ||
    String(
      data.data
    ).indexOf(
      'data:application/pdf;base64,'
    ) !== 0
  ) {

    throw new Error(
      'A PDF file is required.'
    );

  }


  const match =
    String(
      data.data
    ).match(
      /^data:application\/pdf;base64,(.*)$/
    );


  if (
    !match
  ) {

    throw new Error(
      'Invalid PDF data.'
    );

  }


  const folder =
    DriveApp.getFolderById(
      CONFIG.MENU_FOLDER_ID
    );


  const rows =
    readObjects_(
      'Menus'
    );


  const existing =
    rows.find(
      menu =>
        normal_(
          menu.title
        ) ===
        normal_(
          data.title
        ) &&
        normal_(
          menu.status
        ) ===
        'active'
    );


  if (
    existing &&
    existing.driveFileId
  ) {

    try {

      DriveApp
        .getFileById(
          existing.driveFileId
        )
        .setTrashed(
          true
        );

    } catch (
      error
    ) {}

  }


  const safeName =
    String(
      data.title
    )
      .replace(
        /[^a-z0-9_-]+/gi,
        '-'
      );


  const blob =
    Utilities.newBlob(

      Utilities.base64Decode(
        match[1]
      ),

      'application/pdf',

      'AFTR-' +
      safeName +
      '.pdf'

    );


  const file =
    folder.createFile(
      blob
    );


  file.setSharing(

    DriveApp.Access
      .ANYONE_WITH_LINK,

    DriveApp.Permission
      .VIEW

  );


  const now =
    new Date();


  const item = {

    menuId:
      existing
        ? existing.menuId
        : (
            'MENU-' +
            Date.now()
          ),

    title:
      String(
        data.title
      ).trim(),

    driveFileId:
      file.getId(),

    fileUrl:
      'https://drive.google.com/file/d/' +
      file.getId() +
      '/view?usp=sharing',

    status:
      'Active',

    uploadedAt:
      existing
        ? existing.uploadedAt
        : now,

    updatedAt:
      now

  };


  if (
    existing
  ) {

    updateObject_(
      'Menus',
      existing._row,
      item,
      MENU_HEADERS
    );

  } else {

    appendObject_(
      'Menus',
      item,
      MENU_HEADERS
    );

  }


  return json_({

    ok:
      true,

    menu:
      menu_(
        item
      )

  });

}


/* =========================================================
   DELETE MENU
   ========================================================= */

function deleteMenuPdf_(
  data
) {

  const rows =
    readObjects_(
      'Menus'
    );


  const item =
    rows.find(
      menu =>
        String(
          menu.menuId
        ) ===
        String(
          data.id
        )
    );


  if (
    !item
  ) {

    return json_({
      ok:
        true
    });

  }


  if (
    item.driveFileId
  ) {

    try {

      DriveApp
        .getFileById(
          item.driveFileId
        )
        .setTrashed(
          true
        );

    } catch (
      error
    ) {}

  }


  updateObject_(
    'Menus',
    item._row,
    {

      status:
        'Removed',

      updatedAt:
        new Date()

    },

    MENU_HEADERS
  );


  return json_({
    ok:
      true
  });

}


/* =========================================================
   DONE
   ========================================================= */

// All private reads use authenticated POST; credentials never appear in URLs.
function doGet(e) { return readAction_(e, false); }

function unauthorized_() {
  return json_({ ok: false, code: 'UNAUTHORIZED', error: 'Admin sign-in required.' });
}

function verifyAdminToken_(token) {
  try {
    if (typeof token !== 'string' || token.length > 4096) return false;
    const parts = token.split('.');
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return false;
    const properties = PropertiesService.getScriptProperties();
    const secret = properties.getProperty('AFTR_ADMIN_SIGNING_SECRET');
    const configuredEmails = properties.getProperty('AFTR_ADMIN_EMAILS');
    const emails = (configuredEmails != null ? configuredEmails : (properties.getProperty('AFTR_ADMIN_EMAIL') || ''))
      .split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
    const audience = properties.getProperty('AFTR_GOOGLE_CLIENT_ID');
    if (!secret || secret.length < 40 || !emails.length || !audience) return false;
    const expected = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(parts[0], secret)).replace(/=+$/, '');
    let mismatch = expected.length ^ parts[1].length;
    for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ parts[1].charCodeAt(i);
    if (mismatch !== 0) return false;
    const claims = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    const now = Math.floor(Date.now() / 1000);
    return claims.iss === 'aftr-admin' && claims.aud === audience &&
      typeof claims.sub === 'string' && claims.sub.length > 0 &&
      emails.includes(claims.email) &&
      Number.isFinite(claims.iat) && Number.isFinite(claims.exp) &&
      claims.iat <= now + 30 && claims.exp > now &&
      claims.exp > claims.iat && claims.exp - claims.iat <= 900;
  } catch (_) { return false; }
}

// Serialize retried public submissions so the same browser request creates one row/email.
function submitOnce_(data) {
  if (!/^REQ-[A-Za-z0-9-]{10,80}$/.test(String(data.requestId))) throw new Error('Invalid request reference.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('The cafe is receiving requests. Please try again shortly.');
  try {
    if (findRequest_(data.requestId)) return json_({ ok: true, requestId: data.requestId });
    if (data.action === 'booking') return submitTable_(data);
    if (data.action === 'collaboration') return submitCollaboration_(data);
    return submitEvent_(data);
  } finally { lock.releaseLock(); }
}
