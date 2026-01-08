const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'scoreboard.db');
const migrationsPath = path.join(__dirname, 'migrations.sql');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const migrationsSql = fs.readFileSync(migrationsPath, 'utf8');

db.exec(migrationsSql, (err) => {
  if (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
  console.log('Migrations executed successfully');
  db.close();
});