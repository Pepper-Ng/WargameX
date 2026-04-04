const config = require('../config');

let currentSeed = config.map.seed;
let currentSize = config.map.initialSize;

function getSeed() {
  return currentSeed;
}

function setSeed(seed) {
  currentSeed = seed;
}

function getMapSize() {
  return currentSize;
}

function setMapSize(size) {
  const parsed = Number.parseInt(size, 10);
  if (Number.isNaN(parsed) || parsed < 10) {
    throw new Error('Map size must be at least 10');
  }

  currentSize = parsed;
}

module.exports = {
  getSeed,
  setSeed,
  getMapSize,
  setMapSize,
};
