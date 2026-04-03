const express = require('express');
const { getMapArea } = require('../services/mapService');

const router = express.Router();

router.get('/map', async (req, res, next) => {
  try {
    const x = Number.parseInt(req.query.x, 10) || 0;
    const y = Number.parseInt(req.query.y, 10) || 0;
    const range = Number.parseInt(req.query.range, 10) || 5;

    if (range < 0 || range > 20) {
      return res.status(400).json({ error: 'range must be between 0 and 20' });
    }

    const tiles = await getMapArea(x, y, range);
    return res.json({ center: { x, y }, range, tiles });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
