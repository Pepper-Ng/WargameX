const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { all, run } = require('../db/database');
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

router.put('/debug/server-params', async (req, res, next) => {
  try {
    const chunkPrefetchRadius = Number.parseInt(req.body.chunkPrefetchRadius, 10);
    const maxRangePerRequest = Number.parseInt(req.body.maxRangePerRequest, 10);

    if (!Number.isNaN(chunkPrefetchRadius) && chunkPrefetchRadius >= 0 && chunkPrefetchRadius <= 6) {
      config.map.chunkPrefetchRadius = chunkPrefetchRadius;
    }

    if (!Number.isNaN(maxRangePerRequest) && maxRangePerRequest >= 1 && maxRangePerRequest <= 100) {
      config.map.maxRangePerRequest = maxRangePerRequest;
    }

    return res.json({
      message: 'Server parameters updated',
      serverParameters: {
        maxRangePerRequest: config.map.maxRangePerRequest,
        chunkPrefetchRadius: config.map.chunkPrefetchRadius,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/debug/base/:id', async (req, res, next) => {
  try {
    await run("DELETE FROM forces WHERE id = ? AND type = 'base'", [req.params.id]);
    return res.json({ message: 'Base deleted' });
  } catch (error) {
    return next(error);
  }
});

router.delete('/debug/force/:id', async (req, res, next) => {
  try {
    await run("DELETE FROM forces WHERE id = ? AND type != 'base'", [req.params.id]);
    return res.json({ message: 'Force deleted' });
  } catch (error) {
    return next(error);
  }
});

router.get('/debug/logs', async (req, res, next) => {
  try {
    const logPath = path.join(__dirname, '../../logs/server.log');
    if (!fs.existsSync(logPath)) {
      return res.json({ logs: '' });
    }

    const text = fs.readFileSync(logPath, 'utf8');
    const lines = text.trim().split('\n');
    const tail = lines.slice(Math.max(0, lines.length - 200)).join('\n');
    return res.json({ logs: tail });
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
