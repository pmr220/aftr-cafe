# AFTR Hostinger migration

Use a Node.js Web App imported from pmr220/aftr-cafe, not a PHP/HTML upload.

## Build settings
- Framework: Express
- Node: 22.x
- Root: repository root (`.`)
- Package manager: pnpm (matches pnpm-lock.yaml)
- Build command if required: `pnpm run build`
- Start command: `pnpm start`
- Entry file: `server.js`
- No compiled frontend output folder is generated. If a directory is required, use `.` for the Express app, not static hosting.
- PORT is supplied by the host; do not hardcode it.

## Environment variables
Copy privately from the existing Vercel environment; do not put secrets in Git or chat:
- AFTR_GOOGLE_CLIENT_ID
- AFTR_ADMIN_EMAILS: retain all currently authorized admins
- AFTR_ADMIN_SIGNING_SECRET: must exactly match the existing Apps Script property
- NODE_ENV: production
- AFTR_ALLOWED_ORIGINS: comma-separated exact HTTPS origins. Include https://aftrcafe.in and https://www.aftrcafe.in. Add the exact temporary Hostinger origin for preview testing if needed. No trailing slashes or wildcard domains.

Do not generate a replacement signing secret just for this migration. Apps Script continues to use the existing client-owned deployment. No Code.gs copy or redeploy is needed.

## Before domain cutover
1. Use a temporary Hostinger domain for initial deployment.
2. In the existing Google OAuth client, add the temporary HTTPS origin (if used), https://aftrcafe.in and https://www.aftrcafe.in as Authorized JavaScript origins. Keep the Vercel origin during migration. This app uses the GIS callback, not redirect-URI login.
3. Verify pages, video, menus, images and public APIs. Confirm unknown/private source paths return 404.
4. Test Google admin login, dashboard reads and one clearly identified test booking/approval. Verify sender and calendar. This creates real data/emails; coordinate with the client.
5. Attach the final domain to the Node app. There is an existing Hostinger placeholder using aftrcafe.in; inspect it before detaching that domain. Do not delete other websites.
6. Use Hostinger's Node app DNS instructions. Preserve existing MX/TXT/email records at GoDaddy; do not assume the PHP hosting IP is the Node app's destination.
7. Verify HTTPS, apex and www, and retest Google login on the final domain.

Vercel stays available as rollback. Hostinger migration does not move Sheets/Drive/Calendar ownership or remove Google service quotas. Vercel-specific CDN cache headers are not proof of caching on Hostinger; monitor public-feed latency there.
