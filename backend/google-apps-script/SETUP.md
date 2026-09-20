# AFTR backend setup — client phase 1

The Web App still uses the existing Google Sheet tabs `Events`, `Slots`, and `Requests`.

## Web App deployment
- Execute as: Me
- Who has access: Anyone
- After changing `Code.gs`: Deploy → Manage deployments → Edit → New version → Deploy.

## Menu PDFs
The new code automatically creates a Google Drive folder named `AFTR Menu PDFs` in the executing account's My Drive the first time the admin uploads a menu PDF. The Admin → Menu PDFs tab can then add, replace, and remove menu PDFs. Home → View Menu reads the public list from the backend.

No menu PDF needs to be supplied during this website update; the client can upload them later.

## Public event flow
- Partner With Us → Events submits to `Events` as `pending`.
- Book a Space submits to `Events` as `pending`.
- Admin approval changes the event to `approved`.
- Approved events are returned by `?action=events`, so both Home and Events pages update automatically.
- Approved events are also synced to the configured Google Calendar. The calendar sync uses an event ID marker to prevent duplicate events when an approved event is edited.

Calendar note: approval is saved even if Calendar sync fails; Admin receives `calendarSynced:false` plus an error message in the backend response.
