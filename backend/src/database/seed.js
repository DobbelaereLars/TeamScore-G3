const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', '..', 'data', 'scoreboard.db');
const seedPath = path.join(__dirname, 'seed.sql');

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database niet gevonden. Voer eerst migrations uit door de server te starten.');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);
const seedSql = fs.readFileSync(seedPath, 'utf8');

db.exec(seedSql, (err) => {
  if (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
  console.log('✓ Testdata succesvol toegevoegd!');
  db.close();
});
