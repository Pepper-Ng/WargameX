const { run, get, all } = require('../db/database');

async function findTileByCoordinates(x, y) {
  return get('SELECT * FROM tiles WHERE x = ? AND y = ?', [x, y]);
}

async function createTile(x, y, resourceAmount, regenerationRate) {
  const result = await run(
    `INSERT INTO tiles (x, y, resource_amount, resource_regeneration_rate)
     VALUES (?, ?, ?, ?)`,
    [x, y, resourceAmount, regenerationRate]
  );

  return get('SELECT * FROM tiles WHERE id = ?', [result.id]);
}

async function findTilesInRange(minX, maxX, minY, maxY) {
  return all(
    `SELECT * FROM tiles WHERE x BETWEEN ? AND ? AND y BETWEEN ? AND ?`,
    [minX, maxX, minY, maxY]
  );
}

module.exports = {
  findTileByCoordinates,
  createTile,
  findTilesInRange,
};
