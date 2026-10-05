(() => {
  const validUrl = value => /^https:\/\/www\.instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/$/.test(value || '');
  const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function cards(posts) {
    return posts.filter(p => validUrl(p.url) && /^[A-Za-z0-9_-]{10,150}$/.test(p.imageId)).map(p =>
      `<a class="ig-card" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer"><span class="ig-card-heading"><span class="aftr-wordmark">;AFTR</span> <small>Instagram ↗</small></span><img loading="lazy" decoding="async" src="/api/event-image?id=${encodeURIComponent(p.imageId)}" alt="${esc(p.caption || 'A moment at AFTR')}"><span class="ig-card-caption">${esc(p.caption || 'A moment at AFTR')}<small>View on Instagram ↗</small></span></a>`).join('');
  }
  const section = document.querySelector('#instagramSection');
  if (section) fetch('/api/instagram').then(r => r.json()).then(data => {
    if (!data.ok || !Array.isArray(data.posts)) return;
    const grid = section.querySelector('.ig-grid');
    grid.innerHTML = cards(data.posts);
    section.hidden = !grid.children.length;
    grid.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
      img.onerror = null; img.src = 'assets/event-placeholder.svg';
    }, { once: true }));
  }).catch(() => {});

  window.aftrInstagramAdmin = post => {
    const form = document.querySelector('#instagramForm');
    const list = document.querySelector('#instagramAdminList');
    const status = document.querySelector('#instagramStatus');
    let generation = 0, editingId = null, posts = [];
    form.addEventListener('reset', () => { editingId = null; form.querySelector('[name="image"]').required = true; });
    async function load() {
      const current = generation;
      list.textContent = 'Loading Instagram posts…';
      try {
        const response = await fetch(window.AFTR_API_URL + '?action=instagram_posts', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !data.ok || !Array.isArray(data.posts)) throw Error('Unable to load posts.');
        if (generation !== current) return;
        posts = data.posts;
        list.innerHTML = data.posts.map(p => `<article class="request-row"><div>${esc(p.caption || 'Instagram post')}<br><small>${esc(p.url)}</small></div><button type="button" class="ig-edit" data-id="${esc(p.id)}">Edit</button><button type="button" class="ig-remove" data-id="${esc(p.id)}">Remove from website</button></article>`).join('') || 'No Instagram posts yet.';
      } catch (error) { if (generation === current) list.textContent = error.message; }
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      if (submit.disabled) return;
      const current = generation;
      submit.disabled = true;
      status.textContent = 'Publishing…';
      try {
        const file = form.querySelector('[name="image"]').files[0];
        if ((!file && !editingId) || (file && (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2097152))) throw Error('Choose a JPG, PNG or WebP image up to 2 MB.');
        const image = file ? await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Unable to read image.')); reader.readAsDataURL(file); }) : '';
        if (generation !== current) return;
        await post({ action: 'save_instagram_post', id: editingId, url: form.querySelector('[name="url"]').value, caption: form.querySelector('[name="caption"]').value, image });
        if (generation !== current) return;
        form.reset(); editingId = null; form.querySelector('[name="image"]').required = true; status.textContent = 'Published. The Experience page may take up to a minute to refresh.'; await load();
      } catch (error) { if (generation === current) status.textContent = error.message; }
      finally { submit.disabled = false; }
    });
    list.addEventListener('click', async event => {
      const edit = event.target.closest('.ig-edit');
      if (edit) {
        const item = posts.find(p => p.id === edit.dataset.id); if (!item) return;
        editingId = item.id; form.querySelector('[name="url"]').value = item.url;
        form.querySelector('[name="caption"]').value = item.caption;
        form.querySelector('[name="image"]').value = ''; form.querySelector('[name="image"]').required = false;
        status.textContent = 'Editing this card. Leave the photo empty to keep its current image.';
        form.scrollIntoView({ block: 'center' }); return;
      }
      const button = event.target.closest('.ig-remove');
      if (!button || button.disabled || !confirm('Remove this card from the website? The original Instagram post will remain.')) return;
      const current = generation; button.disabled = true;
      try {
        await post({ action: 'delete_instagram_post', id: button.dataset.id });
        if (generation !== current) return;
        status.textContent = 'Removed. The public page may take up to a minute to refresh.'; await load();
      } catch (error) { if (generation === current) status.textContent = error.message; }
      finally { button.disabled = false; }
    });
    return { load, reset() { generation++; editingId = null; posts = []; form.reset(); list.textContent = ''; status.textContent = ''; } };
  };
})();
