const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// JSON API (voorbeeld)
app.use(express.json());
// TODO: je routes/sockets hier importeren:
// const sessionsRouter = require('./routes/sessions');
// app.use('/api/sessions', sessionsRouter);

// Frontend dist serveren
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(distPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});