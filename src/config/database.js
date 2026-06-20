const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const defaultDatabasePath = path.join(__dirname, "..", "..", "data", "f1-race-manager.db");
const databasePath = path.resolve(process.env.DB_PATH || defaultDatabasePath);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fantasy_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    budget_limit REAL NOT NULL DEFAULT 100,
    budget_used REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS fantasy_team_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('driver', 'constructor')),
    external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    team_name TEXT,
    nationality TEXT,
    initials TEXT,
    price REAL NOT NULL,
    points REAL NOT NULL,
    position_index INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    UNIQUE (team_id, item_type, external_id)
  );

  CREATE INDEX IF NOT EXISTS idx_fantasy_teams_user_id ON fantasy_teams(user_id);
  CREATE INDEX IF NOT EXISTS idx_fantasy_items_team_id ON fantasy_team_items(team_id);
`);

module.exports = db;
