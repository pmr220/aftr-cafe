// Explicit origins only; an incoming Host header cannot grant access.
module.exports = function allowedOrigin(origin) {
  const configured = process.env.AFTR_ALLOWED_ORIGINS;
  const origins = (configured === undefined
    ? 'https://aftr-cafe-parth.vercel.app,https://aftrcafe.in,https://www.aftrcafe.in'
    : configured).split(',').map(value => value.trim()).filter(Boolean);
  return typeof origin === 'string' && origins.includes(origin);
};
