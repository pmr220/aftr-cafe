(() => {
const progress=document.querySelector('.progress');
const nav=document.querySelector('.nav');
window.addEventListener('scroll',()=>{const h=document.documentElement.scrollHeight-innerHeight;if(progress&&h>0)progress.style.width=(scrollY/h*100)+'%';if(nav)nav.classList.toggle('scrolled',scrollY>40);},{passive:true});
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.12});
document.querySelectorAll('.reveal,.reveal-left').forEach(el=>io.observe(el));
const toggle=document.querySelector('.menu-toggle');
if(toggle){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',open?'true':'false');toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');});}
document.querySelectorAll('.navlinks a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');if(toggle){toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation');}}));
const video=document.querySelector('video'); if(video){video.muted=true;video.play().catch(()=>{});}
const form=document.querySelector('#contactForm');
if(form){form.addEventListener('submit',e=>{e.preventDefault();const name=document.querySelector('#name').value.trim();const message=document.querySelector('#message').value.trim();if(!name||!message)return;const phone='918208248282';window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Hello AFTR, I am ${name}. ${message}`)}`,'_blank');const success=document.querySelector('.success');if(success)success.classList.add('show');});}
const cursor=document.querySelector('.cursor');
if(cursor&&matchMedia('(pointer:fine)').matches){addEventListener('mousemove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px'});document.querySelectorAll('a,button,.image-wrap').forEach(el=>{el.addEventListener('mouseenter',()=>cursor.classList.add('big'));el.addEventListener('mouseleave',()=>cursor.classList.remove('big'));});}
})();
