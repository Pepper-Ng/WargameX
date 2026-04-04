const { run, all, get } = require('./database');
const config = require('../config');
const migrations = require('./migrations');
const { getTileType, hash2d } = require('../engine/biomeGenerator');
const { getSeed, setSeed, getMapSize, setMapSize } = require('../utils/mapSettings');
const logger = require('../utils/logger');

function randomInt(min, max, ratio) {
  return Math.floor(ratio * (max - min + 1)) + min;
}

function buildTileStats(x, y) {
  const seed = getSeed();
  const tileType = getTileType(x, y);
  const profile = config.map.resourcesByType[tileType] || config.map.resourcesByType.normal;
  const baseRatio = hash2d(x, y, `${seed}:resource`);
  const regenRatio = hash2d(x, y, `${seed}:regen`);

  return {
    tileType,
    resourceAmount: randomInt(profile.min, profile.max, baseRatio),
    regenerationRate: randomInt(profile.regenMin, profile.regenMax, regenRatio),
  };
}

async function ensureMigrationsTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function runMigrations() {
  await ensureMigrationsTable();
  const rows = await all('SELECT version FROM schema_migrations ORDER BY version');
  const appliedVersions = new Set(rows.map((row) => row.version));

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;

    logger.log('Startup', `Running DB migration v${migration.version} (${migration.name})...`);
    await run('BEGIN TRANSACTION');
    try {
      await migration.up({ run, get, all });
      await run('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [
        migration.version,
        migration.name,
      ]);
      await run('COMMIT');
      logger.log('Startup', `Migration v${migration.version} completed.`);
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  }
}

async function getDatabaseVersion() {
  const row = await get('SELECT MAX(version) AS version FROM schema_migrations');
  return row && row.version ? row.version : 0;
}

async function ensureTileTypeColumn() {
  const columns = await all('PRAGMA table_info(tiles)');
  const hasTileType = columns.some((column) => column.name === 'tile_type');

  if (!hasTileType) {
    logger.log('Startup', 'Migrating tiles table to include tile_type...');
    await run("ALTER TABLE tiles ADD COLUMN tile_type TEXT NOT NULL DEFAULT 'normal'");

    const tiles = await all('SELECT id, x, y FROM tiles');
    await run('BEGIN TRANSACTION');
    try {
      for (const tile of tiles) {
        const stats = buildTileStats(tile.x, tile.y);
        // eslint-disable-next-line no-await-in-loop
        await run('UPDATE tiles SET tile_type = ? WHERE id = ?', [stats.tileType, tile.id]);
      }
      await run('COMMIT');
      logger.log('Startup', 'Tile migration completed.');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  }
}

async function warmInitialMapInBackground() {
  const half = Math.floor(getMapSize() / 2);
  const min = -half;
  const max = half - 1;

  logger.log('Startup', `Warming initial map area in background using seed "${getSeed()}"...`);

  await run('BEGIN TRANSACTION');
  try {
    for (let x = min; x <= max; x += 1) {
      for (let y = min; y <= max; y += 1) {
        const stats = buildTileStats(x, y);
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
         max_y = MAX(max_y, excluded.max_y),
         updated_at = CURRENT_TIMESTAMP`,
      [min, max, min, max]
    );

    await run('COMMIT');
    logger.log('Startup', 'Initial map warmup finished.');
  } catch (error) {
    await run('ROLLBACK');
    logger.error('Startup', `Map warmup failed: ${error.message}`);
  }
}

async function regenerateMap(seed, size) {
  logger.log('Startup', `Regenerating map with new seed "${seed}" and size ${size || getMapSize()}...`);
  setSeed(seed);
  if (size !== undefined) {
    setMapSize(size);
  }

  await run('BEGIN TRANSACTION');
  try {
    await run('DELETE FROM tiles');
    await run('DELETE FROM map_state');
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }

  await run(
    `INSERT INTO map_state (id, min_x, max_x, min_y, max_y)
     VALUES (1, 0, 0, 0, 0)
     ON CONFLICT(id) DO NOTHING`
  );

  await warmInitialMapInBackground();
  logger.log('Startup', `Map regeneration finished for seed "${seed}".`);
}

async function initializeDatabase() {
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA synchronous = NORMAL');

  await runMigrations();
  await ensureTileTypeColumn();

  await run(
    `INSERT INTO map_state (id, min_x, max_x, min_y, max_y)
     VALUES (1, 0, 0, 0, 0)
     ON CONFLICT(id) DO NOTHING`
  );
}

module.exports = {
  initializeDatabase,
  warmInitialMapInBackground,
  regenerateMap,
  getDatabaseVersion,
};
