const { run, get } = require('../db/database');

async function createPlayer(username, passwordHash) {
  const result = await run(
    'INSERT INTO players (username, password_hash) VALUES (?, ?)',
    [username, passwordHash]
  );

  return get('SELECT id, username, created_at FROM players WHERE id = ?', [result.id]);
}

async function findPlayerByUsername(username) {
  return get('SELECT * FROM players WHERE username = ?', [username]);
}

async function findPlayerById(id) {
  return get('SELECT id, username, created_at FROM players WHERE id = ?', [id]);
}

module.exports = {
  createPlayer,
  findPlayerByUsername,
  findPlayerById,
};
