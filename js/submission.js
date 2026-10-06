(() => {
  const states = new WeakMap();
  const ids = new Map();
  function state(form) {
    if (!states.has(form)) states.set(form, { busy: false, sent: false });
    return states.get(form);
  }
  window.AFTRSubmission = {
    wrap(form, handler) {
      return async event => {
        event.preventDefault();
        const s = state(form);
        if (s.busy || s.sent) return;
        s.busy = true;
        const buttons = [...form.querySelectorAll('button[type="submit"],input[type="submit"]')];
        const originals = buttons.map(button => ({ button, disabled: button.disabled, html: button.innerHTML, value: button.value }));
        form.setAttribute('aria-busy', 'true');
        buttons.forEach(button => { button.disabled = true; if (button.tagName === 'INPUT') button.value = 'Sending…'; else button.textContent = 'Sending…'; });
        try { await handler(event); }
        catch { window.AFTRSubmission.error(form); }
        finally {
          s.busy = false; form.removeAttribute('aria-busy');
          if (!s.sent) originals.forEach(({button,disabled,html,value}) => { button.disabled=disabled; button.innerHTML=html; button.value=value; });
        }
      };
    },
    complete(form) {
      state(form).sent = true;
      const panel = document.createElement('div');
      panel.className = 'request-confirmation'; panel.setAttribute('role', 'status'); panel.tabIndex = -1;
      panel.innerHTML = '<h3>Request sent</h3><p>Thank you. The AFTR team will review your request and contact you to confirm the details.</p>';
      form.after(panel); form.hidden = true; panel.focus();
    },
    error(form) {
      let panel = form.querySelector('.submission-error');
      if (!panel) { panel=document.createElement('p'); panel.className='submission-error'; panel.setAttribute('role','alert'); form.append(panel); }
      panel.textContent = 'We could not confirm submission. Check with AFTR before sending again; your request may already have reached us.';
    },
    async send(url, options) {
      const body=JSON.parse(options.body);
      delete body.requestId; delete body.id;
      const bytes=new TextEncoder().encode(JSON.stringify(body));
      const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
      const key='aftr-submission-'+hash;
      let saved=ids.get(key);
      try { saved=saved || JSON.parse(sessionStorage.getItem(key)); } catch {}
      if (!saved || Date.now()-saved.at>86400000) saved={id:'REQ-'+crypto.randomUUID(),at:Date.now()};
      ids.set(key,saved);
      try { sessionStorage.setItem(key,JSON.stringify(saved)); } catch {}
      body.requestId=saved.id;
      try {
        const response=await fetch(url,{...options,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
        const data=await response.json();
        if (typeof data?.ok === 'boolean') return {json:async()=>data};
      } catch {}
      // Never replay the submission. Read its saved receipt after an uncertain response.
      for (let attempt=0;attempt<3;attempt++) {
        try {
          const response=await fetch('/api/submission-receipt',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({requestId:saved.id}),signal:AbortSignal.timeout(22000)});
          const receipt=await response.json();
          if (response.ok && receipt.ok && receipt.received===true) return {json:async()=>({ok:true,requestId:saved.id})};
        } catch {}
      }
      throw new Error('Confirmation is delayed. Your request may already be saved. Please contact AFTR before submitting again. Reference: '+saved.id);
    }
  };
})();
