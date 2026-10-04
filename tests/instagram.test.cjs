const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('Instagram cards validate links, add, edit, list and soft-remove independently', () => {
  const rows = [['id','url','caption','imageId','createdAt','status']];
  let uploads = 0, released = 0;
  const sheet = { getLastRow: () => rows.length, getDataRange: () => ({ getValues: () => rows }),
    appendRow: row => rows.push(row), getRange: (r,c) => ({ setValue: v => { rows[r-1][c-1]=v; }, setValues: v => { rows[r-1]=v[0]; } }) };
  const ctx = vm.createContext({ CONFIG: { SHEET_ID:'sheet', EVENT_PHOTOS_FOLDER_ID:'photos' }, json_: x => x,
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => released++ }) },
    Utilities: { base64Decode: x => Buffer.from(x,'base64'), newBlob: () => ({}), getUuid: () => 'card-id' },
    DriveApp: { Access: { ANYONE_WITH_LINK: 'public' }, Permission: { VIEW:'view' }, getFolderById: () => ({ createFile: () => { uploads++; return { setSharing(){}, getId: () => 'abcdefghijk123' }; } }) }
  });
  vm.runInContext(fs.readFileSync('backend/google-apps-script/Instagram.gs','utf8'),ctx);
  for (const url of ['javascript:alert(1)','https://evil.example/p/abc/','https://www.instagram.com.evil.example/p/abc/','https://www.instagram.com/user/']) assert.throws(() => ctx.instagramUrl_(url));
  const data = { url:'https://instagram.com/p/ABC_123/?igsh=tracking', caption:'=formula', image:'data:image/jpeg;base64,/9j/AA==' };
  assert.equal(ctx.instagramSave_(data).ok,true);
  assert.equal(rows[1][2],"'=formula");
  assert.equal(ctx.instagramList_().posts[0].url,'https://www.instagram.com/p/ABC_123/');
  assert.equal(ctx.instagramSave_({ id:'card-id', url:'https://www.instagram.com/reel/other/', caption:'Updated' }).ok,true);
  assert.equal(uploads,1);
  assert.equal(ctx.instagramList_().posts[0].caption,'Updated');
  ctx.instagramDelete_({id:'card-id'});
  assert.equal(ctx.instagramList_().posts.length,0);
  assert.equal(rows.length,2);
  assert.equal(released,3);
});
test('Public Instagram endpoint ignores supplied actions and does not cache failures', async () => {
  const handler = require('../api/instagram'); const original = global.fetch;
  const response = () => ({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.data=v;}});
  try {
    global.fetch = async url => { assert.equal(new URL(url).search,'?action=instagram_posts'); return Response.json({ok:true,posts:[{id:'1',url:'link',caption:'text',imageId:'id',secret:'omit'}]}); };
    const res=response(); await handler({method:'GET',query:{action:'admin_requests'}},res);
    assert.equal(res.code,200); assert.equal(res.data.posts[0].secret,undefined);
    global.fetch = async () => new Response('<html>error');
    const failed=response(); await handler({method:'GET'},failed);
    assert.equal(failed.code,502); assert.equal(failed.headers['Cache-Control'],'no-store');
  } finally { global.fetch=original; }
});
