const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const { setupSockets } = require("./sockets");
const { initDatabase } = require("./database/db");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for development
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ],
    credentials: true,
  }),
);

// Initialize database
initDatabase()
  .then(() => {
    console.log("Database ready");
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });

// Verwachte paden voor key/cert (worden NIET meegecommit)
// Certificaten worden door het deploy-script aangemaakt in backend/certs
const CERT_DIR = path.join(__dirname, "..", "certs");
const KEY_PATH = path.join(CERT_DIR, "key.pem");
const CERT_PATH = path.join(CERT_DIR, "cert.pem");

// JSON API (voorbeeld)
app.use(express.json());

// API Routes
const playersRouter = require("./routes/players");
const teamsRouter = require("./routes/teams");
const sessionsRouter = require("./routes/sessions");
const gamesRouter = require("./routes/games");

app.use("/api/players", playersRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/games", gamesRouter);

const scoresRouter = require("./routes/scores");
app.use("/api/scores", scoresRouter);

// Frontend dist serveren
const distPath = path.join(__dirname, "..", "..", "frontend", "dist");

// Manifest expliciet met juist content-type
app.get("/favicon/site.webmanifest", (req, res) => {
  res.type("application/manifest+json");
  res.sendFile(path.join(distPath, "favicon", "site.webmanifest"));
});

app.use(express.static(distPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Probeer HTTPS te starten als key/cert bestaan, anders val terug op HTTP
let server;
if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
  const options = {
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH),
  };

  server = https.createServer(options, app);
  server.listen(PORT, () => {
    console.log(`HTTPS server running on port ${PORT}`);
  });
} else {
  server = http.createServer(app);
  server.listen(PORT, () => {
    console.warn(
      "⚠️  HTTPS certificaten niet gevonden (backend/certs/key.pem & cert.pem). Server draait nu op HTTP.",
    );
    console.log(`HTTP server running on port ${PORT}`);
  });
}

// Setup Socket.io
const io = setupSockets(server);
app.set("socketio", io);
console.log("Socket.io initialized");
