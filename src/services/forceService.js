const config = require('../config');
const { findPlayerById } = require('../models/playerModel');
const { createForce, findBaseByOwnerId, findForcesByTile } = require('../models/forceModel');
const { getTile } = require('./mapService');
const { AppError } = require('../utils/errors');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function createBase(ownerId) {
  const player = await findPlayerById(ownerId);
  if (!player) throw new AppError('Player not found', 404);

  const existingBase = await findBaseByOwnerId(ownerId);
  if (existingBase) throw new AppError('Player already has a base', 409);

  let x;
  let y;
  let attempts = 0;

  while (attempts < 100) {
    x = randomInt(-config.baseSpawnRange, config.baseSpawnRange);
    y = randomInt(-config.baseSpawnRange, config.baseSpawnRange);

    // Base tiles must not already contain another base and must be on normal terrain.
    // eslint-disable-next-line no-await-in-loop
    const forces = await findForcesByTile(x, y);
    const hasBase = forces.some((force) => force.type === 'base');

    // eslint-disable-next-line no-await-in-loop
    const tile = await getTile(x, y);
    const isNormalTile = tile.tile_type === 'normal';

    if (!hasBase && isNormalTile) break;
    attempts += 1;
  }

  if (attempts >= 100) {
    throw new AppError('Could not find an available normal base location', 503);
  }

  const base = await createForce(ownerId, x, y, 'base');
  console.log(`[force] base_created ownerId=${ownerId} forceId=${base.id} x=${base.x} y=${base.y}`);
  return base;
}

async function createNormalForce(ownerId) {
  const player = await findPlayerById(ownerId);
  if (!player) throw new AppError('Player not found', 404);

  const base = await findBaseByOwnerId(ownerId);
  if (!base) throw new AppError('Player must create a base first', 400);

  const force = await createForce(ownerId, base.x, base.y, 'normal');
  console.log(`[force] normal_created ownerId=${ownerId} forceId=${force.id} x=${force.x} y=${force.y}`);
  return force;
}

module.exports = {
  createBase,
  createNormalForce,
};
