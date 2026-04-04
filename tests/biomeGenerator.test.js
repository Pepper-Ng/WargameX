const test = require('node:test');
const assert = require('node:assert/strict');

const { getTileType, hash2d } = require('../src/engine/biomeGenerator');

test('hash2d returns deterministic values', () => {
  const first = hash2d(10, 20, 'seedA');
  const second = hash2d(10, 20, 'seedA');
  const third = hash2d(10, 20, 'seedB');

  assert.equal(first, second);
  assert.notEqual(first, third);
});

test('tile type generation is deterministic for same coordinate', () => {
  const a = getTileType(3, 7);
  const b = getTileType(3, 7);

  assert.equal(a, b);
});

test('generator yields supported tile types', () => {
  const allowed = new Set(['water', 'rock', 'wood', 'normal']);

  for (let x = -15; x <= 15; x += 5) {
    for (let y = -15; y <= 15; y += 5) {
      const tileType = getTileType(x, y);
      assert.equal(allowed.has(tileType), true);
    }
  }
});
