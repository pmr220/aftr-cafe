# Instagram cards — deployment after design approval

This feature is local until both the backend and website are deployed.

1. Keep the current Apps Script deployment version for rollback.
2. Replace the original AFTR project's Code.gs with this repository's updated Code.gs.
3. In the same Apps Script project, click + beside Files, select Script, name it
   Instagram (the editor adds .gs), and paste the complete Instagram.gs from this folder.
   Both files are required. Save both.
4. Deploy a New version of the existing deployment. Keep its URL, Execute as and
   access settings unchanged. No new Script Properties are needed.
5. After the design is approved, commit and push the feature files, then wait for
   the Vercel production deployment to be Ready.
6. Sign in as an allowed admin, choose Instagram Posts, and publish a real approved
   photo with its exact Instagram post/reel URL. Caption is optional. Image limit:
   2 MB, JPG/PNG/WebP. Only use photos the café is authorized to publish.
7. Check the Experience page on desktop and phone. Cards open the specific post in
   a new tab; Instagram decides whether the visitor needs to sign in or open its app.
8. Test Edit with no new photo (existing photo retained), then remove a test card.
   Public cache can delay updates for approximately one minute; reload to see them.

The InstagramPosts tab is created in the existing backend spreadsheet on the first
successful save. Covers use the existing event-photos folder and are public by link.
Removal hides the website card but retains its row and image for recovery; it does
not remove the original Instagram post. The feature supports 60 published cards.
Existing booking, calendar, menu and approval actions are not changed.

Tests use simulated Google services; live uploads, Google permissions, and device
appearance still require the checks above. Failed/empty feeds hide the public section.
For rollback, revert the website feature commit and select the prior Apps Script
deployment version. Keep the InstagramPosts tab and uploads until reviewed.
