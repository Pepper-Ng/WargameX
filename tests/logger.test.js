const test = require('node:test');
const assert = require('node:assert/strict');

const { formatTimestamp } = require('../src/utils/logger');

test('formatTimestamp emits ISO datetime string', () => {
  const output = formatTimestamp(new Date('2026-01-01T00:00:00.000Z'));
  assert.equal(output, '2026-01-01T00:00:00.000Z');
});
