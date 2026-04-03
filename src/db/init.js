const { run } = require('./database');

async function initializeDatabase() {
  // Keep schema intentionally simple and extensible.
  await run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      resource_amount INTEGER NOT NULL,
      resource_regeneration_rate INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (x, y)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS forces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('normal', 'base')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES players(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      force_id INTEGER NOT NULL,
      unit_type TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (force_id) REFERENCES forces(id)
    )
  `);
}

module.exports = {
  initializeDatabase,
};
