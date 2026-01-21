const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'scoreboard.db');
const migrationsPath = path.join(__dirname, 'migrations.sql');

let db;

function runQuery(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function getAll(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function ensureColumnExists(database, tableName, columnName, columnDef) {
  try {
    const columns = await getAll(database, `PRAGMA table_info(${tableName})`);
    const columnExists = columns.some((col) => col.name === columnName);

    if (!columnExists) {
      console.log(`Adding missing column ${columnName} to ${tableName}...`);
      await runQuery(
        database,
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`,
      );
      console.log(`✓ Added ${columnName} to ${tableName}`);
    }
  } catch (error) {
    console.warn(
      `Warning: Could not check/add column ${columnName} to ${tableName}:`,
      error.message,
    );
  }
}

async function performSchemaUpdates(database) {
  // Update voor Session.status (toegevoegd jan 2026)
  await ensureColumnExists(
    database,
    'Session',
    'status',
    "TEXT DEFAULT 'created' CHECK (status IN ('created', 'in_progress', 'finished'))",
  );

  // Update voor Participant.team_id (toegevoegd jan 2026)
  await ensureColumnExists(database, 'Participant', 'team_id', 'INTEGER');

  // Update voor Game.is_finished (mogelijk later toegevoegd)
  await ensureColumnExists(
    database,
    'Game',
    'is_finished',
    'INTEGER DEFAULT 0 CHECK (is_finished IN (0, 1))',
  );
  
  // Update voor Game.current_set (toegevoegd jan 2026 voor sets support)
  await ensureColumnExists(
    database,
    'Game',
    'current_set',
    'INTEGER DEFAULT 1',
  );

  // Update voor Participant.type constraints en velden kunnen complexer zijn,
  // maar ALTER TABLE ondersteunt geen constraint modificaties makkelijk in SQLite.
  // We focussen op nieuwe kolommen.
}

function initDatabase() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Database connection error:', err);
        return reject(err);
      }

      try {
        // 1. Run basic migrations (creates tables IF NOT EXISTS)
        const migrationsSql = fs.readFileSync(migrationsPath, 'utf8');

        // Split op puntkomma voor betere error reporting, maar db.exec is sneller.
        // We gebruiken exec omdat splitsen op ; soms fout gaat bij triggers/blocks.
        await new Promise((res, rej) => {
          db.exec(migrationsSql, (err) => {
            if (err) return rej(err);
            res();
          });
        });

        // 2. Perform specific schema updates for existing tables
        await performSchemaUpdates(db);

        console.log(
          '✓ Database initialized and migrations executed successfully',
        );
        resolve(db);
      } catch (error) {
        console.error('Migration error:', error);
        reject(error);
      }
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
