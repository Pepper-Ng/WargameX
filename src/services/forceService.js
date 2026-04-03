const config = require('../config');
const { findPlayerById } = require('../models/playerModel');
const { createForce, findBaseByOwnerId, findForcesByTile } = require('../models/forceModel');
const { getTile } = require('./mapService');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function createBase(ownerId) {
  const player = await findPlayerById(ownerId);
  if (!player) throw new Error('Player not found');

  const existingBase = await findBaseByOwnerId(ownerId);
  if (existingBase) throw new Error('Player already has a base');

  let x;
  let y;
  let attempts = 0;

  while (attempts < 50) {
    x = randomInt(-config.baseSpawnRange, config.baseSpawnRange);
    y = randomInt(-config.baseSpawnRange, config.baseSpawnRange);

    // Base tiles must not already contain another base.
    // eslint-disable-next-line no-await-in-loop
    const forces = await findForcesByTile(x, y);
    const hasBase = forces.some((force) => force.type === 'base');
    if (!hasBase) break;
    attempts += 1;
  }

  if (attempts >= 50) {
    throw new Error('Could not find an available base location');
  }

  await getTile(x, y);
  const base = await createForce(ownerId, x, y, 'base');
  console.log(`[force] base_created ownerId=${ownerId} forceId=${base.id} x=${base.x} y=${base.y}`);
  return base;
}

async function createNormalForce(ownerId) {
  const player = await findPlayerById(ownerId);
  if (!player) throw new Error('Player not found');

  const base = await findBaseByOwnerId(ownerId);
  if (!base) throw new Error('Player must create a base first');

  const force = await createForce(ownerId, base.x, base.y, 'normal');
  console.log(`[force] normal_created ownerId=${ownerId} forceId=${force.id} x=${force.x} y=${force.y}`);
  return force;
}

module.exports = {
  createBase,
  createNormalForce,
};
