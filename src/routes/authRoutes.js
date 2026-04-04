const express = require('express');
const { register, login } = require('../services/playerService');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const player = await register(username, password);
    return res.status(201).json({ player });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const player = await login(username, password);
    return res.json({ player, message: 'Login successful' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
