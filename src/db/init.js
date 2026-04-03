const { run, all, get } = require('./database');
const config = require('../config');
const { getTileType, hash2d } = require('../engine/biomeGenerator');

function randomInt(min, max, ratio) {
  return Math.floor(ratio * (max - min + 1)) + min;
}

function buildTileStats(x, y) {
  const tileType = getTileType(x, y);
  const profile = config.map.resourcesByType[tileType] || config.map.resourcesByType.normal;
  const baseRatio = hash2d(x, y, `${config.map.seed}:resource`);
  const regenRatio = hash2d(x, y, `${config.map.seed}:regen`);

  return {
    tileType,
    resourceAmount: randomInt(profile.min, profile.max, baseRatio),
    regenerationRate: randomInt(profile.regenMin, profile.regenMax, regenRatio),
  };
}

async function ensureTileTypeColumn() {
  const columns = await all('PRAGMA table_info(tiles)');
  const hasTileType = columns.some((column) => column.name === 'tile_type');

  if (!hasTileType) {
    await run("ALTER TABLE tiles ADD COLUMN tile_type TEXT NOT NULL DEFAULT 'normal'");

    const tiles = await all('SELECT id, x, y FROM tiles');
    for (const tile of tiles) {
      const stats = buildTileStats(tile.x, tile.y);
      // eslint-disable-next-line no-await-in-loop
      await run('UPDATE tiles SET tile_type = ? WHERE id = ?', [stats.tileType, tile.id]);
    }
  }
}

async function initializeMapArea() {
  const half = Math.floor(config.map.initialSize / 2);
  const min = -half;
  const max = half - 1;

  for (let x = min; x <= max; x += 1) {
    for (let y = min; y <= max; y += 1) {
      const stats = buildTileStats(x, y);
      // Deterministic insert allows startup map bootstrap and safe reruns.
      // eslint-disable-next-line no-await-in-loop
      await run(
        `INSERT OR IGNORE INTO tiles
          (x, y, resource_amount, resource_regeneration_rate, tile_type)
         VALUES (?, ?, ?, ?, ?)`,
        [x, y, stats.resourceAmount, stats.regenerationRate, stats.tileType]
      );
    }
  }

  await run(
    `INSERT INTO map_state (id, min_x, max_x, min_y, max_y)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       min_x = MIN(min_x, excluded.min_x),
       max_x = MAX(max_x, excluded.max_x),
       min_y = MIN(min_y, excluded.min_y),
       max_y = MAX(max_y, excluded.max_y)`,
    [min, max, min, max]
  );
}

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
      tile_type TEXT NOT NULL DEFAULT 'normal',
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

  await run(`
    CREATE TABLE IF NOT EXISTS map_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      min_x INTEGER NOT NULL,
      max_x INTEGER NOT NULL,
      min_y INTEGER NOT NULL,
      max_y INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureTileTypeColumn();
  await initializeMapArea();

  const state = await get('SELECT * FROM map_state WHERE id = 1');
  if (!state) {
    throw new Error('Map initialization failed');
  }
}

module.exports = {
  initializeDatabase,
};
