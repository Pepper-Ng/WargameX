const config = require('../config');

function hash2d(x, y, seedText) {
  let hash = 2166136261;
  const data = `${seedText}:${x},${y}`;

  for (let i = 0; i < data.length; i += 1) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 1000000) / 1000000;
}

function smoothNoise(x, y, scale, seed, channel = 'base') {
  const sx = x / scale;
  const sy = y / scale;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const fx = sx - x0;
  const fy = sy - y0;

  const n00 = hash2d(x0, y0, `${seed}:${channel}`);
  const n10 = hash2d(x1, y0, `${seed}:${channel}`);
  const n01 = hash2d(x0, y1, `${seed}:${channel}`);
  const n11 = hash2d(x1, y1, `${seed}:${channel}`);

  const ix0 = n00 + (n10 - n00) * fx;
  const ix1 = n01 + (n11 - n01) * fx;

  return ix0 + (ix1 - ix0) * fy;
}

function layeredNoise(x, y, seed) {
  const broad = smoothNoise(x, y, 36, seed, 'broad');
  const medium = smoothNoise(x, y, 14, seed, 'medium');
  const detail = smoothNoise(x, y, 6, seed, 'detail');

  return broad * 0.5 + medium * 0.3 + detail * 0.2;
}

function getTileType(x, y) {
  const seed = config.map.seed;
  const terrainNoise = layeredNoise(x, y, seed);
  const moisture = smoothNoise(x, y, 18, seed, 'moisture');
  const localVariation = smoothNoise(x, y, 4, seed, 'local-variation');
  const riverBand = Math.abs(smoothNoise(x, y, 10, seed, 'river') - 0.5);

  // River bands create long connected water lines.
  if (riverBand < 0.055 && moisture > 0.35) {
    return 'water';
  }

  const thresholds = config.map.tileTypeWeights;

  // Broad biome placement.
  if (terrainNoise < thresholds.water + 0.06) return 'water';
  if (terrainNoise > 1 - thresholds.rock - 0.05) return 'rock';
  if (moisture > 1 - thresholds.wood - 0.08) return 'wood';

  // Small-scale variation so local map slices are less uniform.
  if (localVariation < 0.12) return 'rock';
  if (localVariation > 0.86) return 'wood';
  if (localVariation > 0.46 && localVariation < 0.51) return 'water';

  return 'normal';
}

module.exports = {
  getTileType,
  hash2d,
};
