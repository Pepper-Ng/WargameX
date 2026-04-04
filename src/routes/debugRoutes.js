const express = require('express');
const path = require('path');
const config = require('../config');
const { all } = require('../db/database');
const { regenerateMap, getDatabaseVersion } = require('../db/init');
const { getSeed, getMapSize } = require('../utils/mapSettings');

const router = express.Router();

router.get('/debug/stats', async (req, res, next) => {
  try {
    const players = await all('SELECT id, username, created_at FROM players ORDER BY id');
    const forces = await all('SELECT id, owner_id, x, y, type, created_at FROM forces ORDER BY owner_id, id');

    const playersTree = players.map((player) => {
      const playerForces = forces.filter((force) => force.owner_id === player.id);
      return {
        ...player,
        bases: playerForces.filter((force) => force.type === 'base'),
        forces: playerForces.filter((force) => force.type !== 'base'),
      };
    });

    return res.json({
      serverParameters: {
        port: config.port,
        maxRangePerRequest: config.map.maxRangePerRequest,
        chunkPrefetchRadius: config.map.chunkPrefetchRadius,
      },
      mapSettings: {
        seed: getSeed(),
        size: getMapSize(),
      },
      databaseVersion: await getDatabaseVersion(),
      players: playersTree,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/debug/regenerate-map', async (req, res, next) => {
  try {
    const seed = (req.body.seed || '').trim();
    const size = Number.parseInt(req.body.size, 10);

    if (!seed) {
      return res.status(400).json({ error: 'seed is required' });
    }

    if (Number.isNaN(size) || size < 10) {
      return res.status(400).json({ error: 'size must be a number >= 10' });
    }

    await regenerateMap(seed, size);
    return res.json({ message: 'Map regenerated', seed, size });
  } catch (error) {
    return next(error);
  }
});

router.get('/debug', (req, res) => {
  return res.sendFile(path.join(__dirname, '../../public/debug.html'));
});

module.exports = router;
