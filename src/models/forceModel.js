const { run, get, all } = require('../db/database');

async function createForce(ownerId, x, y, type = 'normal') {
  const result = await run(
    'INSERT INTO forces (owner_id, x, y, type) VALUES (?, ?, ?, ?)',
    [ownerId, x, y, type]
  );

  return get('SELECT * FROM forces WHERE id = ?', [result.id]);
}

async function findBaseByOwnerId(ownerId) {
  return get('SELECT * FROM forces WHERE owner_id = ? AND type = ?', [ownerId, 'base']);
}

async function findForcesByTile(x, y) {
  return all('SELECT * FROM forces WHERE x = ? AND y = ?', [x, y]);
}

async function findForcesInRange(minX, maxX, minY, maxY) {
  return all(
    'SELECT * FROM forces WHERE x BETWEEN ? AND ? AND y BETWEEN ? AND ?',
    [minX, maxX, minY, maxY]
  );
}

module.exports = {
  createForce,
  findBaseByOwnerId,
  findForcesByTile,
  findForcesInRange,
};
