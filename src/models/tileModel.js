const { run, get, all } = require('../db/database');

async function findTileByCoordinates(x, y) {
  return get('SELECT * FROM tiles WHERE x = ? AND y = ?', [x, y]);
}

async function createTileIfMissing(x, y, resourceAmount, regenerationRate, tileType) {
  await run(
    `INSERT OR IGNORE INTO tiles (x, y, resource_amount, resource_regeneration_rate, tile_type)
     VALUES (?, ?, ?, ?, ?)`,
    [x, y, resourceAmount, regenerationRate, tileType]
  );

  return findTileByCoordinates(x, y);
}

async function findTilesInRange(minX, maxX, minY, maxY) {
  return all(
    `SELECT * FROM tiles WHERE x BETWEEN ? AND ? AND y BETWEEN ? AND ?`,
    [minX, maxX, minY, maxY]
  );
}

module.exports = {
  findTileByCoordinates,
  createTileIfMissing,
  findTilesInRange,
};
