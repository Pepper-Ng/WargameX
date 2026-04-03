const config = require('../config');
const { findTileByCoordinates, createTileIfMissing } = require('../models/tileModel');
const { findForcesInRange } = require('../models/forceModel');
const { getMapState, expandMapState } = require('../models/mapStateModel');
const { getTileType, hash2d } = require('../engine/biomeGenerator');

function randomInt(min, max, ratio) {
  return Math.floor(ratio * (max - min + 1)) + min;
}

function buildTileStats(x, y) {
  const tileType = getTileType(x, y);
  const profile = config.map.resourcesByType[tileType] || config.map.resourcesByType.normal;

  return {
    tileType,
    resourceAmount: randomInt(profile.min, profile.max, hash2d(x, y, `${config.map.seed}:resource`)),
    regenerationRate: randomInt(
      profile.regenMin,
      profile.regenMax,
      hash2d(x, y, `${config.map.seed}:regen`)
    ),
  };
}

async function ensureGeneratedArea(minX, maxX, minY, maxY) {
  const state = await getMapState();

  // If requested area is already generated, we skip expansion work.
  if (state && minX >= state.min_x && maxX <= state.max_x && minY >= state.min_y && maxY <= state.max_y) {
    return;
  }

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      const stats = buildTileStats(x, y);
      // eslint-disable-next-line no-await-in-loop
      await createTileIfMissing(x, y, stats.resourceAmount, stats.regenerationRate, stats.tileType);
    }
  }

  await expandMapState(minX, maxX, minY, maxY);
}

async function getTile(x, y) {
  const existing = await findTileByCoordinates(x, y);
  if (existing) return existing;

  const stats = buildTileStats(x, y);

  // Atomic insert avoids race conditions under concurrent requests.
  return createTileIfMissing(x, y, stats.resourceAmount, stats.regenerationRate, stats.tileType);
}

async function getMapArea(centerX, centerY, range) {
  const minX = centerX - range;
  const maxX = centerX + range;
  const minY = centerY - range;
  const maxY = centerY + range;

  await ensureGeneratedArea(minX, maxX, minY, maxY);

  const tiles = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
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
    tileType: tile.tile_type,
    resourceAmount: tile.resource_amount,
    resourceRegenerationRate: tile.resource_regeneration_rate,
    forces: forcesByTile.get(`${tile.x},${tile.y}`) || [],
  }));
}

module.exports = {
  getTile,
  getMapArea,
};
