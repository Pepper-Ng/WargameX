const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;

  const hashToCompare = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(
    Buffer.from(originalHash, 'hex'),
    Buffer.from(hashToCompare, 'hex')
  );
}

module.exports = {
  hashPassword,
  verifyPassword,
};
