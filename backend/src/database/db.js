const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'scoreboard.db');
const migrationsPath = path.join(__dirname, 'migrations.sql');

let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        return reject(err);
      }
    });

    const migrationsSql = fs.readFileSync(migrationsPath, 'utf8');

    db.exec(migrationsSql, (err) => {
      if (err) {
        console.error('Migration error:', err);
        return reject(err);
      }
      console.log(
        '✓ Database initialized and migrations executed successfully'
      );
      resolve(db);
    });
  });
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

module.exports = { initDatabase, getDatabase };

// Als dit bestand direct wordt uitgevoerd (voor migraties)
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Standalone migration completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Standalone migration failed:', err);
      process.exit(1);
    });
}
