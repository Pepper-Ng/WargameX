const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../data/wargamex.sqlite'),
  map: {
    resourceAmountMin: 50,
    resourceAmountMax: 300,
    regenerationRateMin: 1,
    regenerationRateMax: 10,
  },
  baseSpawnRange: 5,
};
