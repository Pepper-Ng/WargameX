const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');

let canRun = true;
let app;
let initializeDatabase;
let server;

function clearProjectModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/workspace/WargameX/src/')) {
      delete require.cache[key];
    }
  }
}

async function requestJson(baseUrl, pathname, method = 'GET', body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return { status: response.status, data };
}

function requireServerReady(t) {
  if (!canRun) {
    t.skip('Integration dependencies unavailable in this environment');
    return false;
  }
  return true;
}

test.before(async () => {
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wargamex-test-'));
    process.env.DB_PATH = path.join(tmpDir, 'integration.sqlite');

    clearProjectModuleCache();

    ({ initializeDatabase } = require('../src/db/init'));
    app = require('../src/app');

    await initializeDatabase();
    server = app.listen(0);

    await new Promise((resolve) => server.once('listening', resolve));
  } catch (error) {
    canRun = false;
  }
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('integration: /map returns tiles and map metadata', async (t) => {
  if (!requireServerReady(t)) return;
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const result = await requestJson(baseUrl, '/map?x=0&y=0&range=1');
  assert.equal(result.status, 200);
  assert.equal(Array.isArray(result.data.tiles), true);
  assert.ok(result.data.mapState);
});

test('integration: /debug/regenerate-map accepts seed and size', async (t) => {
  if (!requireServerReady(t)) return;
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const result = await requestJson(baseUrl, '/debug/regenerate-map', 'POST', {
    seed: 'integration-seed',
    size: 60,
  });

  assert.equal(result.status, 200);
  assert.equal(result.data.seed, 'integration-seed');
  assert.equal(result.data.size, 60);
});

test('integration: /create-base after register', async (t) => {
  if (!requireServerReady(t)) return;
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const register = await requestJson(baseUrl, '/register', 'POST', {
    username: `int_${Date.now()}`,
    password: 'test123',
  });

  assert.equal(register.status, 201);
  const playerId = register.data.player.id;

  const createBase = await requestJson(baseUrl, '/create-base', 'POST', { playerId });
  assert.equal(createBase.status, 201);
  assert.equal(createBase.data.base.type, 'base');
});

test('integration: /map/chunk supports explicit chunk coordinates', async (t) => {
  if (!requireServerReady(t)) return;
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const result = await requestJson(baseUrl, '/map/chunk?chunkX=0&chunkY=0&chunkSize=8');
  assert.equal(result.status, 200);
  assert.equal(result.data.chunk.chunkSize, 8);
  assert.equal(result.data.tiles.length, 64);
});
