const test = require('node:test');
const assert = require('node:assert/strict');

const { getSeed, setSeed, getMapSize, setMapSize } = require('../src/utils/mapSettings');

test('map seed can be changed at runtime', () => {
  const original = getSeed();
  setSeed('temporary-seed');
  assert.equal(getSeed(), 'temporary-seed');
  setSeed(original);
});

test('map size can be changed at runtime', () => {
  const original = getMapSize();
  setMapSize(120);
  assert.equal(getMapSize(), 120);
  setMapSize(original);
});

test('map size validation rejects too-small values', () => {
  assert.throws(() => setMapSize(5), /Map size must be at least 10/);
});
