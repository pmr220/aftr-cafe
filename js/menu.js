(() => {
 const modal=document.querySelector('#menuModal'); if(!modal)return;
 const list=document.querySelector('#menuList'), button=document.querySelector('#openMenu');
 let cached=null, loadedAt=0, pending=null;
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
 function downloadUrl(value){
   try {
     const url=new URL(value);
     if(url.protocol!=='https:' || url.hostname!=='drive.google.com')return '';
     const id=url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)/)?.[1] || url.searchParams.get('id');
     if(!id || !/^[A-Za-z0-9_-]{10,150}$/.test(id))return '';
     const direct=new URL('https://drive.usercontent.google.com/download');
     direct.searchParams.set('id',id); direct.searchParams.set('export','download');
     const key=url.searchParams.get('resourcekey'); if(key)direct.searchParams.set('resourcekey',key);
     return direct.href;
   }catch{return '';}
 }
 function load(){
   if(cached && Date.now()-loadedAt<60000)return Promise.resolve(cached);
   if(pending)return pending;
   pending=fetch('/api/menus').then(async response=>{
     if(!response.ok)throw Error();
     const data=await response.json();
     if(data.ok!==true || !Array.isArray(data.menus))throw Error();
     cached=data.menus.map(menu=>({...menu,url:downloadUrl(menu.url)})).filter(menu=>menu.url);
     loadedAt=Date.now(); return cached;
   }).finally(()=>{pending=null;});
   return pending;
 }
 const close=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');};
 async function open(event){
   event.preventDefault(); if(button.getAttribute('aria-busy')==='true')return;
   button.setAttribute('aria-busy','true');
   modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
   list.innerHTML='<div class="admin-empty">Loading menu…</div>';
   try{
     const menus=await load(); if(!modal.classList.contains('open'))return;
     if(menus.length===1){close();window.location.assign(menus[0].url);return;}
     list.innerHTML=menus.length ? menus.map(menu=>`<a class="menu-pdf-item" href="${esc(menu.url)}" rel="noopener"><span>${esc(menu.title)}</span><small>Download PDF ↓</small></a>`).join('') : '<div class="menu-pdf-empty">Our menu will be available soon.</div>';
   }catch{list.innerHTML='<div class="menu-pdf-empty">Unable to load the menu right now. Please close this window and try again.</div>';}
   finally{button.removeAttribute('aria-busy');}
 }
 button.addEventListener('click',open);
 document.querySelector('#menuClose').addEventListener('click',close);
 modal.querySelector('.event-modal-backdrop').addEventListener('click',close);
 document.addEventListener('keydown',event=>event.key==='Escape'&&close());
 // Preload the list only; the PDF downloads only after a click.
 load().catch(()=>{});
})();
