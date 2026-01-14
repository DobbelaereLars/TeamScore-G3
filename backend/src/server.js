const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Verwachte paden voor key/cert (worden NIET meegecommit)
// Certificaten worden door het deploy-script aangemaakt in backend/certs
const CERT_DIR = path.join(__dirname, '..', 'certs');
const KEY_PATH = path.join(CERT_DIR, 'key.pem');
const CERT_PATH = path.join(CERT_DIR, 'cert.pem');

// JSON API (voorbeeld)
app.use(express.json());
// TODO: je routes/sockets hier importeren:
// const sessionsRouter = require('./routes/sessions');
// app.use('/api/sessions', sessionsRouter);

// Frontend dist serveren
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');

// Manifest expliciet met juist content-type
app.get('/favicon/site.webmanifest', (req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(distPath, 'favicon', 'site.webmanifest'));
});

app.use(express.static(distPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Probeer HTTPS te starten als key/cert bestaan, anders val terug op HTTP
if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
  const options = {
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH),
  };

  https.createServer(options, app).listen(PORT, () => {
    console.log(`HTTPS server running on port ${PORT}`);
  });
} else {
  http.createServer(app).listen(PORT, () => {
    console.warn(
      '⚠️  HTTPS certificaten niet gevonden (backend/certs/key.pem & cert.pem). Server draait nu op HTTP.'
    );
    console.log(`HTTP server running on port ${PORT}`);
  });
}
