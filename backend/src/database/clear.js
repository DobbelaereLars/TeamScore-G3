const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', '..', 'data', 'scoreboard.db');

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database niet gevonden. Niets om te wissen.');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

const clearSql = `
  -- Disable foreign key constraints
  PRAGMA foreign_keys = OFF;

  DROP TABLE IF EXISTS FinalScore;
  DROP TABLE IF EXISTS Score;
  DROP TABLE IF EXISTS Participant;
  DROP TABLE IF EXISTS TeamPlayer;
  DROP TABLE IF EXISTS Game;
  DROP TABLE IF EXISTS ScoreModel;
  DROP TABLE IF EXISTS Player;
  DROP TABLE IF EXISTS Team;
  DROP TABLE IF EXISTS Session;
  
  PRAGMA foreign_keys = ON;
`;

db.exec(clearSql, (err) => {
  if (err) {
    console.error('❌ Fout bij leegmaken database:', err);
    process.exit(1);
  }
  db.close();
});
