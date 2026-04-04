const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../data/wargamex.sqlite'),
  map: {
    seed: process.env.MAP_SEED || 'wargamex-seed',
    initialSize: 100,
    maxRangePerRequest: 20,
    chunkPrefetchRadius: 2,
    tileTypeWeights: {
      water: 0.16,
      rock: 0.12,
      wood: 0.30,
      normal: 0.42,
    },
    resourcesByType: {
      water: { min: 10, max: 50, regenMin: 1, regenMax: 2 },
      rock: { min: 40, max: 140, regenMin: 1, regenMax: 3 },
      wood: { min: 80, max: 240, regenMin: 2, regenMax: 6 },
      normal: { min: 50, max: 180, regenMin: 1, regenMax: 4 },
    },
  },
  baseSpawnRange: 5,
};
