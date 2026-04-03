const express = require('express');
const { createBase, createNormalForce } = require('../services/forceService');

const router = express.Router();

router.post('/create-base', async (req, res, next) => {
  try {
    const { playerId } = req.body;
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }

    const base = await createBase(playerId);
    return res.status(201).json({ base });
  } catch (error) {
    return next(error);
  }
});

router.post('/create-force', async (req, res, next) => {
  try {
    const { playerId } = req.body;
    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }

    const force = await createNormalForce(playerId);
    return res.status(201).json({ force });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
