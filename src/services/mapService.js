const config = require('../config');
const { findTileByCoordinates, createTileIfMissing } = require('../models/tileModel');
const { findForcesInRange } = require('../models/forceModel');
const { getMapState } = require('../models/mapStateModel');
const { getTileType, hash2d } = require('../engine/biomeGenerator');
const { getSeed, getMapSize } = require('../utils/mapSettings');

function randomInt(min, max, ratio) {
  return Math.floor(ratio * (max - min + 1)) + min;
}

function buildTileStats(x, y) {
  const tileType = getTileType(x, y);
  const profile = config.map.resourcesByType[tileType] || config.map.resourcesByType.normal;
  const seed = getSeed();

  return {
    tileType,
    resourceAmount: randomInt(profile.min, profile.max, hash2d(x, y, `${seed}:resource`)),
    regenerationRate: randomInt(profile.regenMin, profile.regenMax, hash2d(x, y, `${seed}:regen`)),
  };
}

async function getTile(x, y, stateOverride) {
  const state = stateOverride || (await getMapState());
  if (state && (x < state.min_x || x > state.max_x || y < state.min_y || y > state.max_y)) {
    return {
      x,
      y,
      tile_type: 'edge',
      resource_amount: 0,
      resource_regeneration_rate: 0,
      is_edge: 1,
    };
  }

  const existing = await findTileByCoordinates(x, y);
  if (existing) return existing;

  const stats = buildTileStats(x, y);
  return createTileIfMissing(x, y, stats.resourceAmount, stats.regenerationRate, stats.tileType);
}

async function getMapArea(centerX, centerY, range) {
  const minX = centerX - range;
  const maxX = centerX + range;
  const minY = centerY - range;
  const maxY = centerY + range;
  const state = await getMapState();

  const forces = await findForcesInRange(minX, maxX, minY, maxY);
  const forcesByTile = new Map();

  for (const force of forces) {
    const key = `${force.x},${force.y}`;
    if (!forcesByTile.has(key)) forcesByTile.set(key, []);
    forcesByTile.get(key).push(force);
  }

  const tiles = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      // eslint-disable-next-line no-await-in-loop
      const tile = await getTile(x, y, state);
      const key = `${x},${y}`;

      tiles.push({
        x,
        y,
        tileType: tile.tile_type,
        resourceAmount: tile.resource_amount,
        resourceRegenerationRate: tile.resource_regeneration_rate,
        isEdge: tile.tile_type === 'edge',
        forces: tile.tile_type === 'edge' ? [] : forcesByTile.get(key) || [],
      });
    }
  }

  return {
    tiles,
    mapState: state,
    seed: getSeed(),
    mapSize: getMapSize(),
  };
}

async function getMapChunk(chunkX, chunkY, chunkSize = 16) {
  const minX = chunkX * chunkSize;
  const maxX = minX + chunkSize - 1;
  const minY = chunkY * chunkSize;
  const maxY = minY + chunkSize - 1;
  const state = await getMapState();

  const forces = await findForcesInRange(minX, maxX, minY, maxY);
  const forcesByTile = new Map();
  for (const force of forces) {
    const key = `${force.x},${force.y}`;
    if (!forcesByTile.has(key)) forcesByTile.set(key, []);
    forcesByTile.get(key).push(force);
  }

  const tiles = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      // eslint-disable-next-line no-await-in-loop
      const tile = await getTile(x, y, state);
      const key = `${x},${y}`;
      tiles.push({
        x, y,
        tileType: tile.tile_type,
        resourceAmount: tile.resource_amount,
        resourceRegenerationRate: tile.resource_regeneration_rate,
        isEdge: tile.tile_type === 'edge',
        forces: tile.tile_type === 'edge' ? [] : forcesByTile.get(key) || [],
      });
    }
  }

  return {
    chunk: { chunkX, chunkY, chunkSize },
    tiles,
    mapState: state,
    seed: getSeed(),
    mapSize: getMapSize(),
  };
}

module.exports = {
  getTile,
  getMapArea,
  getMapChunk,
};
