const config = require('../config');
const { findTileByCoordinates, createTile } = require('../models/tileModel');
const { findForcesInRange } = require('../models/forceModel');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getTile(x, y) {
  const existing = await findTileByCoordinates(x, y);
  if (existing) return existing;

  const tile = await createTile(
    x,
    y,
    randomInt(config.map.resourceAmountMin, config.map.resourceAmountMax),
    randomInt(config.map.regenerationRateMin, config.map.regenerationRateMax)
  );

  return tile;
}

async function getMapArea(centerX, centerY, range) {
  const minX = centerX - range;
  const maxX = centerX + range;
  const minY = centerY - range;
  const maxY = centerY + range;

  const tiles = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      // Generate missing tiles lazily while building map response.
      // eslint-disable-next-line no-await-in-loop
      const tile = await getTile(x, y);
      tiles.push(tile);
    }
  }

  const forces = await findForcesInRange(minX, maxX, minY, maxY);
  const forcesByTile = new Map();

  for (const force of forces) {
    const key = `${force.x},${force.y}`;
    if (!forcesByTile.has(key)) forcesByTile.set(key, []);
    forcesByTile.get(key).push(force);
  }

  return tiles.map((tile) => ({
    x: tile.x,
    y: tile.y,
    resourceAmount: tile.resource_amount,
    resourceRegenerationRate: tile.resource_regeneration_rate,
    forces: forcesByTile.get(`${tile.x},${tile.y}`) || [],
  }));
}

module.exports = {
  getTile,
  getMapArea,
};
