// Independent website cards. No Instagram login, scraping, or changes to bookings.
const IG_HEADERS = ['id', 'url', 'caption', 'imageId', 'createdAt', 'status'];
function instagramUrl_(value) {
  const match = String(value || '').trim().match(/^https:\/\/(?:www\.)?instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)\/?(?:\?[^\s]*)?$/i);
  if (!match) throw new Error('Enter a valid https://www.instagram.com/p/... or /reel/... link.');
  return 'https://www.instagram.com/' + match[1].toLowerCase() + '/' + match[2] + '/';
}
function instagramSheet_(create) {
  const book = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = book.getSheetByName('InstagramPosts');
  if (!sheet && create) {
    sheet = book.insertSheet('InstagramPosts');
    sheet.appendRow(IG_HEADERS);
  }
  return sheet;
}
function instagramList_() {
  const sheet = instagramSheet_(false);
  if (!sheet || sheet.getLastRow() < 2) return json_({ ok: true, posts: [] });
  const posts = sheet.getDataRange().getValues().slice(1)
    .filter(row => row[5] === 'Published')
    .map(row => ({ id: String(row[0]), url: String(row[1]), caption: String(row[2]).replace(/^'(?=[=+@-])/, ''), imageId: String(row[3]), createdAt: String(row[4]) }))
    .reverse();
  return json_({ ok: true, posts });
}
function instagramSave_(data) {
  const url = instagramUrl_(data.url);
  const caption = String(data.caption || '').trim();
  if (caption.length > 300) throw new Error('Caption must be 300 characters or fewer.');
  const match = String(data.image || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if ((!data.id || data.image) && (!match || match[2].length > 2800000)) throw new Error('Upload a JPG, PNG or WebP image smaller than 2 MB.');
  const bytes = match ? Utilities.base64Decode(match[2]) : null;
  if (bytes && bytes.length > 2 * 1024 * 1024) throw new Error('Image must be smaller than 2 MB.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Another post is being saved. Please try again.');
  let file;
  try {
    const sheet = instagramSheet_(true);
    const rows = sheet.getDataRange().getValues();
    const index = data.id ? rows.findIndex((row, i) => i > 0 && String(row[0]) === String(data.id) && row[5] === 'Published') : -1;
    if (data.id && index < 1) throw new Error('Post not found.');
    if (!data.id && rows.filter(row => row[5] === 'Published').length >= 60) throw new Error('Remove an older card before adding another (60 active cards maximum).');
    if (bytes) {
    file = DriveApp.getFolderById(CONFIG.EVENT_PHOTOS_FOLDER_ID).createFile(
      Utilities.newBlob(bytes, 'image/' + match[1], 'aftr-instagram-' + Utilities.getUuid() + '.' + match[1]));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    // Escape spreadsheet formulas in customer-managed text.
    const row = [data.id || Utilities.getUuid(), url, /^[=+@-]/.test(caption) ? "'" + caption : caption,
      file ? file.getId() : rows[index][3], data.id ? rows[index][4] : new Date().toISOString(), 'Published'];
    if (data.id) sheet.getRange(index + 1, 1, 1, 6).setValues([row]);
    else sheet.appendRow(row);
    return json_({ ok: true });
  } catch (error) {
    if (file) { try { file.setTrashed(true); } catch (_) {} }
    throw error;
  } finally { lock.releaseLock(); }
}
function instagramDelete_(data) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Another post is being updated. Please try again.');
  try {
    const sheet = instagramSheet_(false);
    if (!sheet) throw new Error('Post not found.');
    const rows = sheet.getDataRange().getValues();
    const index = rows.findIndex((row, i) => i > 0 && String(row[0]) === String(data.id));
    if (index < 1) throw new Error('Post not found.');
    sheet.getRange(index + 1, 6).setValue('Removed');
    // Keep the uploaded file and original Instagram post intact.
    return json_({ ok: true });
  } finally { lock.releaseLock(); }
}
