const test = require('node:test');
const assert = require('node:assert/strict');

const { parseInteger } = require('../src/utils/parse');

test('parseInteger preserves explicit zero', () => {
  assert.equal(parseInteger('0', 5), 0);
});

test('parseInteger uses fallback for invalid values', () => {
  assert.equal(parseInteger('not-a-number', 5), 5);
  assert.equal(parseInteger(undefined, 5), 5);
});
