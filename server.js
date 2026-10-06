const express = require('express');
const path = require('node:path');
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  for (const header of require('./vercel.json').headers[0].headers) res.setHeader(header.key, header.value);
  next();
});
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
}, express.json({ limit: '32kb' }), express.text({ type: 'text/plain', limit: '32kb' }));
for (const name of ['admin-login', 'admin-read', 'events', 'menus', 'instagram', 'event-image', 'submission-receipt']) {
  app.all('/api/' + name, require('./api/' + name));
}
// Serve only public files, never the repository root or backend source.
for (const directory of ['assets', 'css', 'js']) {
  app.use('/' + directory, express.static(path.join(__dirname, directory), { dotfiles: 'deny', index: false, maxAge: 0 }));
}
for (const page of ['index', 'about', 'admin', 'book', 'contact', 'events', 'experience', 'partner', 'reserve']) {
  app.get('/' + page + '.html', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, page + '.html'));
  });
}
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.use((req, res) => res.status(404).send('Not found'));
app.use((error, req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500)
    .json({ ok: false, error: 'Unable to process this request.' });
});
if (require.main === module) {
  app.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => console.log('AFTR server ready'));
}
module.exports = app;
