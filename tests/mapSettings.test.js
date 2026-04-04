const test = require('node:test');
const assert = require('node:assert/strict');

const { getSeed, setSeed } = require('../src/utils/mapSettings');

test('map seed can be changed at runtime', () => {
  const original = getSeed();
  setSeed('temporary-seed');
  assert.equal(getSeed(), 'temporary-seed');
  setSeed(original);
});
