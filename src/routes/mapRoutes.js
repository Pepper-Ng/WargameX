const express = require('express');
const config = require('../config');
const { getMapArea, getMapChunk } = require('../services/mapService');
const { parseInteger } = require('../utils/parse');

const router = express.Router();

router.get('/map', async (req, res, next) => {
  try {
    const x = parseInteger(req.query.x, 0);
    const y = parseInteger(req.query.y, 0);
    const range = parseInteger(req.query.range, 5);

    if (range < 0 || range > config.map.maxRangePerRequest) {
      return res
        .status(400)
        .json({ error: `range must be between 0 and ${config.map.maxRangePerRequest}` });
    }

    const mapData = await getMapArea(x, y, range);
    return res.json({ center: { x, y }, range, ...mapData });
  } catch (error) {
    return next(error);
  }
});

router.get('/map/chunk', async (req, res, next) => {
  try {
    const chunkX = parseInteger(req.query.chunkX, 0);
    const chunkY = parseInteger(req.query.chunkY, 0);
    const chunkSize = parseInteger(req.query.chunkSize, 16);

    if (chunkSize < 4 || chunkSize > 64) {
      return res.status(400).json({ error: 'chunkSize must be between 4 and 64' });
    }

    const chunkData = await getMapChunk(chunkX, chunkY, chunkSize);
    return res.json(chunkData);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
