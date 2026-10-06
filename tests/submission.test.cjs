const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {webcrypto}=require('node:crypto');
test('Approval recovers only a verified Approved result and never repeats the mutation',async()=>{
 const source=fs.readFileSync('js/admin.js','utf8');
 const post=source.slice(source.indexOf('  async function post(payload)'),source.indexOf('  async function get(action)'));
 let writes=0,reads=0,status='Approved';
 const ctx=vm.createContext({AbortSignal,fetch:async(url,options)=>{
   const body=JSON.parse(options.body);
   if(url==='backend'){assert.equal(body.action,'approve_request');writes++;return {json:async()=>{throw Error('HTML');}};}
   assert.equal(url,'/api/admin-read');assert.equal(body.action,'admin_request_status');assert.equal(body.id,'REQ-123');reads++;
   return {json:async()=>({ok:true,status})};
 }});
 vm.runInContext("const API='backend';let adminToken='token',expiresAt=Date.now()+60000;function signOut(){}\n"+post+'\nthis.invoke=post;',ctx);
 assert.equal((await ctx.invoke({action:'approve_request',id:'REQ-123'})).approved,true);
 assert.equal(writes,1);assert.equal(reads,1);
 status='Pending';await assert.rejects(ctx.invoke({action:'approve_request',id:'REQ-123'}),/Confirmation could not be retrieved/);
 assert.equal(writes,2);assert.equal(reads,3);
});
test('A lost submission response checks receipts without replaying the write or inventing success',async()=>{
 let writes=0,reads=0,received=true;
 const ctx=vm.createContext({window:{},TextEncoder,crypto:webcrypto,AbortSignal,
   sessionStorage:{getItem:()=>null,setItem(){}},fetch:async(url,options)=>{
     if(url==='backend'){writes++;return {json:async()=>{throw new SyntaxError('HTML response');}};}
     assert.equal(url,'/api/submission-receipt');reads++;
     assert.deepEqual(Object.keys(JSON.parse(options.body)),['requestId']);
     return {ok:true,json:async()=>({ok:true,received})};
   }});
 vm.runInContext(fs.readFileSync('js/submission.js','utf8'),ctx);
 const options={body:JSON.stringify({action:'booking',name:'Person'})};
 const response=await ctx.window.AFTRSubmission.send('backend',options);
 assert.equal((await response.json()).ok,true);assert.equal(writes,1);assert.equal(reads,1);
 received=false;
 await assert.rejects(ctx.window.AFTRSubmission.send('backend',options),/Confirmation is delayed/);
 assert.equal(writes,2);assert.equal(reads,4);
});
test('Rapid clicks run once; success hides form; uncertain retries keep the same reference',async()=>{
 const storage=new Map(),bodies=[];
 const ctx=vm.createContext({window:{},TextEncoder,AbortSignal,crypto:webcrypto,sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:async(url,options)=>{bodies.push(JSON.parse(options.body));return {json:async()=>({ok:true})};},document:{createElement:()=>({setAttribute(){},focus(){}})}});
 vm.runInContext(fs.readFileSync('js/submission.js','utf8'),ctx);
 const button={disabled:false,innerHTML:'Send',tagName:'BUTTON'};
 const form={querySelectorAll:()=>[button],setAttribute(){},removeAttribute(){},after(panel){this.panel=panel;}};
 const api=ctx.window.AFTRSubmission;
 let release,calls=0;const wait=new Promise(resolve=>{release=resolve;});
 const submit=api.wrap(form,async()=>{calls++;await wait;api.complete(form);});
 const first=submit({preventDefault(){}});await submit({preventDefault(){}});
 assert.equal(calls,1);assert.equal(button.disabled,true);assert.equal(button.textContent,'Sending…');assert.notEqual(form.hidden,true);
 release();await first;assert.equal(form.hidden,true);assert.match(form.panel.innerHTML,/Request sent/);
 await submit({preventDefault(){}});assert.equal(calls,1);
 const options={body:JSON.stringify({action:'booking',name:'Person'})};
 await api.send('backend',options);await api.send('backend',options);
 assert.equal(bodies[0].requestId,bodies[1].requestId);
 await api.send('backend',{body:JSON.stringify({action:'booking',name:'Different'})});assert.notEqual(bodies[0].requestId,bodies[2].requestId);
 const retryForm={...form,hidden:false},retryButton={...button,disabled:false};retryForm.querySelectorAll=()=>[retryButton];
 await api.wrap(retryForm,async()=>{})({preventDefault(){}});assert.equal(retryButton.disabled,false);
});
test('Backend retry creates one request/email and approval includes table guests',()=>{
 let submissions=0,releases=0,existing=false,mail;
 const ctx=vm.createContext({console,LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>releases++})},MailApp:{sendEmail:(...args)=>{mail=args;}}});
 vm.runInContext(fs.readFileSync('backend/google-apps-script/Code.gs','utf8'),ctx);
 ctx.json_=v=>v;ctx.findRequest_=()=>existing?{}:null;
 ctx.submitTable_=()=>{submissions++;existing=true;return {ok:true};};
 const data={action:'booking',requestId:'REQ-abcdefghij123456'};
 assert.equal(ctx.submitOnce_(data).ok,true);assert.equal(ctx.submitOnce_(data).ok,true);
 assert.equal(submissions,1);assert.equal(releases,2);
 ctx.normalizeDate_=()=> '2026-10-10';ctx.timeDisplay_=()=> '12:00 PM — 1:00 PM';
 ctx.sendApprovalEmail_({email:'test@example.com',name:'Guest',requestGroup:'Table Reservations',requestType:'Reserve a Table',guests:6},false);
 assert.match(mail[2],/Type: Table Reservation\nNumber of guests: 6/);assert.doesNotMatch(mail[2],/Reserve a Table/);
});
