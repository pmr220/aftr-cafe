# Deploy admin Google sign-in

Local tests cover authentication and routing with simulated Apps Script services.
Real Google sign-in, deployed Apps Script permissions, and uploads still need live checks.

1. Keep the current Apps Script deployment version available for reference. The ignored
   AFTR-backend-current.txt is the original editor backup; never publish it.
2. Copy the entire updated backend/google-apps-script/Code.gs into the original AFTR
   Apps Script project's Code.gs and save. Leave all four Script Properties intact.
3. Deploy > Manage deployments > select the deployment matching js/config.js > pencil
   icon > Version: New version > Deploy. Keep the existing web-app URL, execution identity
   and public access setting: public customer forms still need to reach this endpoint.
   During the short interval before the frontend deploys, old PIN admin requests will fail.
4. Commit the changed website, backend, tests, package.json, pnpm-lock.yaml, api folder,
   .gitignore, .vercelignore and this guide; push to main. Do not commit the backup,
   node_modules, environment files or secrets. Vercel should install dependencies and
   deploy the new API and static pages. Keep framework preset Other and no build command.
5. Wait for Ready and open https://aftr-cafe-parth.vercel.app/admin.html. Sign in with
   the configured account. Other Google accounts must be rejected. Check requests,
   events, calendar and menus. Sign out: the dashboard should hide; reloading requires login.
6. Check public pages, event images, menu PDF links and availability. Private booking
   titles are replaced with Unavailable in public availability. Booking times are unchanged.
7. Test a controlled booking and admin action, then a menu upload (including a large PDF).
   Requests still go directly to Apps Script so Vercel's request-body limit does not apply.
8. Check that unauthenticated GET ?action=admin_requests and POST admin actions return
   UNAUTHORIZED without exposing records or changing data. Never test mutation actions
   with a valid token unless you intend to perform that action.

Sessions last at most 15 minutes and are held only in browser memory. Sign-out clears
the browser token, but a copied token remains valid until expiry. Rotate the shared
signing secret in both services and redeploy Vercel to invalidate issued tokens urgently.
Never log or share credentials. No Google client secret is used by this implementation.

This change protects admin access; it does not add public form anti-spam, rate limits,
or a complete security audit. Those are separate follow-up tasks.
