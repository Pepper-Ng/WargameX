const config = require('../config');

let currentSeed = config.map.seed;

function getSeed() {
  return currentSeed;
}

function setSeed(seed) {
  currentSeed = seed;
}

module.exports = {
  getSeed,
  setSeed,
};
