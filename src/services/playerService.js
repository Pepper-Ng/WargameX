const { createPlayer, findPlayerByUsername } = require('../models/playerModel');
const { hashPassword, verifyPassword } = require('../utils/password');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

async function register(username, password) {
  const existing = await findPlayerByUsername(username);
  if (existing) {
    throw new AppError('Username is already taken', 409);
  }

  const passwordHash = hashPassword(password);
  const player = await createPlayer(username, passwordHash);
  logger.log('Player', `Registered username=${player.username} id=${player.id}`);
  return player;
}

async function login(username, password) {
  const player = await findPlayerByUsername(username);
  if (!player || !verifyPassword(password, player.password_hash)) {
    throw new AppError('Invalid username or password', 401);
  }

  return {
    id: player.id,
    username: player.username,
    created_at: player.created_at,
  };
}

module.exports = {
  register,
  login,
};
