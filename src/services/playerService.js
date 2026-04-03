const { createPlayer, findPlayerByUsername } = require('../models/playerModel');
const { hashPassword, verifyPassword } = require('../utils/password');

async function register(username, password) {
  const existing = await findPlayerByUsername(username);
  if (existing) {
    throw new Error('Username is already taken');
  }

  const passwordHash = hashPassword(password);
  const player = await createPlayer(username, passwordHash);
  return player;
}

async function login(username, password) {
  const player = await findPlayerByUsername(username);
  if (!player || !verifyPassword(password, player.password_hash)) {
    throw new Error('Invalid username or password');
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
