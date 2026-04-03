const express = require('express');
const config = require('../config');
const { getMapArea } = require('../services/mapService');
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

    const tiles = await getMapArea(x, y, range);
    return res.json({ center: { x, y }, range, tiles });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
