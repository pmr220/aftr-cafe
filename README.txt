AFTR — ALL DAY CAFE
Premium website + Events + Booking + Organiser approval + Availability dashboard

PUBLIC PAGES
index.html — Home
menu.html — Menu
experience.html — Experience
 events.html — Upcoming public events + event details + organiser submission
book.html — Book a Space / date-time availability / enquiry
partner.html — Partner With Us
contact.html — Contact

ADMIN
admin.html — private dashboard for AFTR team
- approve/reject/publish organiser events
- edit event details
- see booking/collaboration requests
- add confirmed cafe bookings / blocked periods

EVENT FLOW
1. Organiser opens Events and selects “Host an event +”.
2. Organiser submits event name, organiser contact, WhatsApp, date, time, pricing, description and photos.
3. Submission is PENDING and is not public.
4. AFTR reviews it in admin.html.
5. AFTR approves it.
6. Approved event appears on Events page.
7. Guest clicks the event, sees date, time, price, description and organiser contact.
8. Guest taps “WhatsApp the organiser” and enquires directly with that organiser’s WhatsApp number.

AVAILABILITY FLOW
- Public Book a Space accepts any date and time — there is no hardcoded day/time limitation.
- AFTR can add confirmed bookings/blocks in admin.html.
- Connected backend returns those blocks to the website.
- If a selected date/time overlaps a confirmed block, the website shows BOOKED / unavailable.
- Booking requests are emailed to AFTR and can be added to Google Calendar.

GOOGLE SETUP
See backend/google-apps-script/SETUP.md.
Paste the deployed Web App URL in js/config.js.

DEMO MODE
Without a backend URL, the site still previews with sample events and local admin data. LocalStorage is only for preview; it is not shared between users/devices.

SECURITY
The included front-end PIN is a demo convenience, not production authentication. For launch, restrict admin write operations with real Google/account authentication or a secure server-side admin layer.
