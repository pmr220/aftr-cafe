const API = 'https://script.google.com/macros/s/AKfycbxHzrM50fNB43-rNfz-jT8g8Po3a4Vgw0TBulplRuX_cZr14FweZd2jEQ0UGUWOGF4X/exec';
module.exports = async (req, res) => {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') return res.status(405).json({ok:false});
  if (req.headers.origin !== 'https://aftr-cafe-parth.vercel.app') return res.status(403).json({ok:false});
  let body; try { body=typeof req.body==='string'?JSON.parse(req.body):req.body; } catch {}
  if (!/^REQ-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body?.requestId || '')) return res.status(400).json({ok:false});
  try {
    const response=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action:'submission_receipt',requestId:body.requestId}),signal:AbortSignal.timeout(20000)});
    const data=await response.json();
    if (!response.ok || data.ok!==true || typeof data.received!=='boolean') throw Error();
    // Only a yes/no receipt; no name, contact details or booking data.
    return res.status(200).json({ok:true,received:data.received});
  } catch { return res.status(502).json({ok:false}); }
};
