(() => {
 const modal=document.querySelector('#menuModal'); if(!modal)return;
 const list=document.querySelector('#menuList'); const API=window.AFTR_API_URL||'';
 const open=()=>{modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');load();};
 const close=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');};
 document.querySelector('#openMenu').addEventListener('click',open); document.querySelector('#menuClose').addEventListener('click',close); modal.querySelector('.event-modal-backdrop').addEventListener('click',close); document.addEventListener('keydown',e=>e.key==='Escape'&&close());
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
 async function load(){
   list.innerHTML='<div class="admin-empty">Loading menu PDFs…</div>';
   let menus=[];
   if(API){try{const r=await fetch(API+'?action=menu',{cache:'no-store'});const d=await r.json();menus=Array.isArray(d.menus)?d.menus:[];}catch{}}
   if(!menus.length){list.innerHTML='<div class="menu-pdf-empty">The latest AFTR menu PDF will appear here soon.</div>';return;}
   list.innerHTML=menus.map(m=>`<a class="menu-pdf-item" href="${esc(m.url)}" target="_blank" rel="noopener"><span>${esc(m.title)}</span><small>Open PDF ↗</small></a>`).join('');
 }
})();
