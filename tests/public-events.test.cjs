const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const events = require('../api/events');
const image = require('../api/event-image');
function response() {
  return { headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.code=code; return this; }, json(data) { this.data=data; }, send(data) { this.data=data; }, end() {} };
}
test('Events cache only public feed and never cache failed responses', async () => {
  const original = global.fetch;
  try {
    global.fetch = async url => {
      assert.equal(new URL(url).search, '?action=events');
      return Response.json({ ok:true, events:[{ title:'Public event' }] });
    };
    const res=response(); await events({method:'GET',query:{action:'admin_requests'}},res);
    assert.equal(res.code,200);
    assert.match(res.headers['Vercel-CDN-Cache-Control'],/s-maxage=60/);
    global.fetch=async()=>new Response('<html>Error</html>');
    const failed=response();await events({method:'GET'},failed);
    assert.equal(failed.code,502);assert.equal(failed.headers['Cache-Control'],'no-store');
  } finally {global.fetch=original;}
});
test('Image proxy only accepts IDs and image content, never Google HTML errors', async()=>{
  const original=global.fetch;
  try {
    global.fetch=async url=>{
      assert.equal(new URL(url).hostname,'drive.google.com');
      return new Response(new Uint8Array([255,216,255]),{headers:{'content-type':'image/jpeg'}});
    };
    const valid=response();await image({method:'GET',query:{id:'abcdefghijk123'}},valid);
    assert.equal(valid.code,200);assert.equal(valid.headers['Content-Type'],'image/jpeg');
    assert.ok(Buffer.isBuffer(valid.data));
    const bad=response();await image({method:'GET',query:{id:'https://evil.example'}},bad);assert.equal(bad.code,400);
    global.fetch=async()=>new Response('<html>Login</html>',{headers:{'content-type':'text/html'}});
    const html=response();await image({method:'GET',query:{id:'abcdefghijk123'}},html);assert.equal(html.code,502);
  } finally {global.fetch=original;}
});
test('Browser shares public events, expires cache and normalizes all Drive image forms',async()=>{
  const storage=new Map();let requests=0;
  const context=vm.createContext({window:{},URL,AbortSignal,sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{addEventListener(){}},fetch:async()=>{requests++;return Response.json({ok:true,events:[{title:'Event'}]});}});
  vm.runInContext(fs.readFileSync('js/public-events.js','utf8'),context);
  const source=context.window.AFTR_PUBLIC_EVENTS;
  assert.equal(source.read(),null);
  await Promise.all([source.load(),source.load()]);assert.equal(requests,1);
  assert.equal(source.read()[0].title,'Event');
  storage.set('aftr-public-events-v1',JSON.stringify({at:Date.now()-900001,events:[]}));assert.equal(source.read(),null);
  for(const url of ['https://drive.google.com/file/d/abcdefghijk123/view','https://drive.google.com/uc?export=view&id=abcdefghijk123','https://drive.google.com/thumbnail?id=abcdefghijk123&sz=w1600']) assert.equal(source.image(url),'/api/event-image?id=abcdefghijk123');
  assert.equal(source.image('javascript:alert(1)'),'');
});
