const express = require('express');
const path = require('path');
const { regenerateMap } = require('../db/init');

const router = express.Router();

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
