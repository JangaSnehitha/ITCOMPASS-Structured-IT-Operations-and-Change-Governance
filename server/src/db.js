// src/db.js
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve absolute path to the SQLite file (project root/db/itsm.sqlite)
// Resolve database path (used in non-test environment)
const dbPath = path.resolve(__dirname, '../../db/itsm.sqlite');

// Ensure the directory exists (only needed for file DB)
if (process.env.NODE_ENV !== 'test') {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

// Determine if we are running in a test environment (Jest sets JEST_WORKER_ID)
const isTest = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
// Open the database: use in‑memory when testing, otherwise file‑based
const db = new Database(isTest ? ':memory:' : dbPath);

// Enforce foreign keys
db.pragma('foreign_keys = ON');

// Load schema if needed (first run)
function initSchema() {
  const hasUsers = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users';").get();
  if (!hasUsers) {
    const schemaSql = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schemaSql);
    console.log('Database schema initialized');
    // Seed a default service for tests and demos
    const serviceCount = db.prepare('SELECT COUNT(*) as cnt FROM services;').get().cnt;
    if (serviceCount === 0) {
      db.prepare('INSERT INTO services (name, description) VALUES (?,?)')
        .run('Default Service', 'Automatically created for testing');
      console.log('Default service seeded');
    }
  }
}

initSchema();

export default db;
