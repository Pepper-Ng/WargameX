const express = require('express');
const { regenerateMap } = require('../db/init');

const router = express.Router();

router.post('/debug/regenerate-map', async (req, res, next) => {
  try {
    const seed = (req.body.seed || '').trim();
    const size = Number.parseInt(req.body.size, 10);

    if (!seed) {
      return res.status(400).json({ error: 'seed is required' });
    }

    if (Number.isNaN(size) || size < 10) {
      return res.status(400).json({ error: 'size must be a number >= 10' });
    }

    await regenerateMap(seed, size);
    return res.json({ message: 'Map regenerated', seed, size });
  } catch (error) {
    return next(error);
  }
});

router.get('/debug', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wargame X Debug</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; max-width: 1200px; }
    button { margin: 4px; padding: 8px 12px; }
    input { padding: 6px 8px; }
    pre { background: #111; color: #0f0; padding: 12px; border-radius: 6px; white-space: pre-wrap; height: 220px; overflow-y: auto; }
    .row { margin-bottom: 10px; }
    #mapContainer { margin: 10px 0; border: 1px solid #ddd; padding: 8px; width: fit-content; }
    #mapGrid { display: grid; gap: 0; }
    .tile { position: relative; border-radius: 0; border: 0; }
    .tile.edge { background: repeating-linear-gradient(45deg,#333,#333 2px,#222 2px,#222 4px); }
    .tile.base::after {
      content: '';
      position: absolute;
      width: 50%;
      height: 50%;
      border-radius: 50%;
      background: #ff2a2a;
      top: 25%;
      left: 25%;
      box-shadow: 0 0 2px #000;
    }
    .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; font-size: 14px; }
    .legend span { display: inline-flex; align-items: center; gap: 4px; }
    .swatch { width: 12px; height: 12px; border: 1px solid #666; display: inline-block; }
    .map-controls { display: grid; grid-template-columns: 40px auto 40px; grid-template-rows: 40px auto 40px; width: fit-content; }
    .map-center { grid-column: 2; grid-row: 2; }
    .map-up { grid-column: 2; grid-row: 1; }
    .map-down { grid-column: 2; grid-row: 3; }
    .map-left { grid-column: 1; grid-row: 2; }
    .map-right { grid-column: 3; grid-row: 2; }
    .small { font-size: 12px; color: #555; }
  </style>
</head>
<body>
  <h1>Wargame X Debug Page</h1>
  <p>Map scrolls dynamically without refresh. Base markers appear at zoom >= 3.</p>

  <div class="row">
    <button id="toggleMapBtn">Hide Map</button>
    <label>Zoom
      <input id="zoomInput" type="range" min="1" max="4" value="1" />
    </label>
    <span id="zoomLabel">1x</span>
    <button id="mapBtn">Reload View</button>
  </div>

  <div id="mapContainer">
    <div class="map-controls">
      <button class="map-up" id="upBtn">▲</button>
      <button class="map-left" id="leftBtn">◀</button>
      <div class="map-center"><div id="mapGrid"></div></div>
      <button class="map-right" id="rightBtn">▶</button>
      <button class="map-down" id="downBtn">▼</button>
    </div>
    <div class="legend">
      <span><i class="swatch" style="background:#4f9cff"></i>water</span>
      <span><i class="swatch" style="background:#9a9a9a"></i>rock</span>
      <span><i class="swatch" style="background:#3b8f3b"></i>wood</span>
      <span><i class="swatch" style="background:#d9c27a"></i>normal</span>
      <span><i class="swatch" style="background:#222"></i>map edge</span>
      <span><i class="swatch" style="background:#ff2a2a"></i>base marker (zoom >= 3)</span>
    </div>
    <div class="small" id="edgeHint"></div>
  </div>

  <div class="row">
    <input id="seedInput" type="text" placeholder="new-map-seed" />
    <input id="sizeInput" type="number" min="10" step="1" value="100" />
    <button id="seedBtn">Regenerate Map With Seed + Size</button>
  </div>

  <div class="row">
    <button id="registerBtn">Register (random)</button>
    <button id="loginBtn">Login</button>
    <button id="baseBtn">Create Base</button>
    <button id="forceBtn">Create Force</button>
  </div>

  <div class="row">
    <strong>Current user:</strong> <span id="userLabel">none</span>
  </div>

  <pre id="output">Ready.</pre>

  <script>
    const state = {
      username: null,
      password: 'test123',
      playerId: null,
      mapVisible: true,
      centerX: 0,
      centerY: 0,
      range: 20,
      zoom: 1,
      cache: new Map(),
      mapState: null,
    };

    const output = document.getElementById('output');
    const userLabel = document.getElementById('userLabel');
    const mapGrid = document.getElementById('mapGrid');
    const mapContainer = document.getElementById('mapContainer');
    const toggleMapBtn = document.getElementById('toggleMapBtn');
    const seedInput = document.getElementById('seedInput');
    const sizeInput = document.getElementById('sizeInput');
    const zoomInput = document.getElementById('zoomInput');
    const zoomLabel = document.getElementById('zoomLabel');
    const edgeHint = document.getElementById('edgeHint');

    const colorsByType = {
      water: '#4f9cff',
      rock: '#9a9a9a',
      wood: '#3b8f3b',
      normal: '#d9c27a',
      edge: '#222',
    };

    function keyFor(x, y, range) {
      return x + ':' + y + ':' + range;
    }

    function setOutput(data) {
      output.textContent = JSON.stringify(data, null, 2);
      output.scrollTop = 0;
    }

    function updateUserLabel() {
      userLabel.textContent = state.username
        ? state.username + ' (id: ' + (state.playerId || 'unknown') + ')'
        : 'none';
    }

    function applyZoom() {
      const tileSize = 12 * state.zoom;
      mapGrid.style.gridTemplateColumns = 'repeat(' + (state.range * 2 + 1) + ', ' + tileSize + 'px)';
      for (const tile of mapGrid.children) {
        tile.style.width = tileSize + 'px';
        tile.style.height = tileSize + 'px';
      }
      zoomLabel.textContent = state.zoom + 'x';
    }

    function drawMap(tiles) {
      mapGrid.innerHTML = '';
      const showBaseMarkers = state.zoom >= 3;
      let edgeCount = 0;

      for (const tile of tiles) {
        const div = document.createElement('div');
        div.className = 'tile';
        if (tile.isEdge) {
          div.classList.add('edge');
          edgeCount += 1;
        }

        div.style.backgroundColor = colorsByType[tile.tileType] || '#ffffff';

        const baseForce = tile.forces.find((force) => force.type === 'base');
        if (showBaseMarkers && baseForce) {
          div.classList.add('base');
          div.title = 'Base at (' + tile.x + ', ' + tile.y + ') owned by ' + baseForce.owner_username;
        } else {
          div.title = 'x=' + tile.x + ', y=' + tile.y + ', type=' + tile.tileType;
        }

        mapGrid.appendChild(div);
      }

      applyZoom();

      edgeHint.textContent = edgeCount > 0
        ? 'Reached map edge. Dark striped tiles indicate the end of generated terrain.'
        : 'Inside generated terrain.';
    }

    function toggleMap() {
      state.mapVisible = !state.mapVisible;
      mapContainer.style.display = state.mapVisible ? 'block' : 'none';
      toggleMapBtn.textContent = state.mapVisible ? 'Hide Map' : 'Show Map';
    }

    async function callApi(url, method = 'GET', body) {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      return { status: response.status, data };
    }

    function clampCenter(nextX, nextY) {
      if (!state.mapState) return { x: nextX, y: nextY };

      const edgeBuffer = 3;
      const minX = state.mapState.min_x + state.range - edgeBuffer;
      const maxX = state.mapState.max_x - state.range + edgeBuffer;
      const minY = state.mapState.min_y + state.range - edgeBuffer;
      const maxY = state.mapState.max_y - state.range + edgeBuffer;

      return {
        x: Math.max(minX, Math.min(maxX, nextX)),
        y: Math.max(minY, Math.min(maxY, nextY)),
      };
    }

    async function fetchMap(x, y, range, useCache = true) {
      const key = keyFor(x, y, range);
      if (useCache && state.cache.has(key)) return state.cache.get(key);

      const result = await callApi('/map?x=' + x + '&y=' + y + '&range=' + range);
      if (result.status === 200) {
        state.cache.set(key, result);
      }
      return result;
    }

    async function prefetchNeighbors() {
      const offsets = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];

      for (const offset of offsets) {
        const next = clampCenter(state.centerX + offset.x * 3, state.centerY + offset.y * 3);
        fetchMap(next.x, next.y, state.range, true);
      }
    }

    async function loadMapView(forceRefresh = false) {
      const result = await fetchMap(state.centerX, state.centerY, state.range, !forceRefresh);
      if (result.status === 200 && result.data.tiles) {
        state.mapState = result.data.mapState;
        drawMap(result.data.tiles);
      }
      setOutput({ action: 'map', center: { x: state.centerX, y: state.centerY }, ...result });
      prefetchNeighbors();
    }

    async function moveBy(dx, dy) {
      const next = clampCenter(state.centerX + dx, state.centerY + dy);
      if (next.x === state.centerX && next.y === state.centerY) {
        setOutput({ action: 'map-scroll', message: 'Reached generated map boundary.' });
        return;
      }

      state.centerX = next.x;
      state.centerY = next.y;
      await loadMapView();
    }

    document.getElementById('registerBtn').addEventListener('click', async () => {
      try {
        state.username = 'player_' + Math.random().toString(36).slice(2, 8);
        const result = await callApi('/register', 'POST', {
          username: state.username,
          password: state.password,
        });

        state.playerId = result.data.player && result.data.player.id;
        updateUserLabel();
        setOutput({ action: 'register', ...result });
      } catch (error) {
        setOutput({ action: 'register', error: error.message });
      }
    });

    document.getElementById('loginBtn').addEventListener('click', async () => {
      try {
        if (!state.username) {
          setOutput({ error: 'Register first so we know which user to login.' });
          return;
        }

        const result = await callApi('/login', 'POST', {
          username: state.username,
          password: state.password,
        });

        state.playerId = result.data.player && result.data.player.id;
        updateUserLabel();
        setOutput({ action: 'login', ...result });
      } catch (error) {
        setOutput({ action: 'login', error: error.message });
      }
    });

    document.getElementById('baseBtn').addEventListener('click', async () => {
      try {
        if (!state.playerId) {
          setOutput({ error: 'Login/register first.' });
          return;
        }

        const result = await callApi('/create-base', 'POST', { playerId: state.playerId });
        setOutput({ action: 'create-base', ...result });
        await loadMapView(true);
      } catch (error) {
        setOutput({ action: 'create-base', error: error.message });
      }
    });

    document.getElementById('forceBtn').addEventListener('click', async () => {
      try {
        if (!state.playerId) {
          setOutput({ error: 'Login/register first.' });
          return;
        }

        const result = await callApi('/create-force', 'POST', { playerId: state.playerId });
        setOutput({ action: 'create-force', ...result });
        await loadMapView(true);
      } catch (error) {
        setOutput({ action: 'create-force', error: error.message });
      }
    });

    document.getElementById('mapBtn').addEventListener('click', async () => {
      await loadMapView(true);
    });

    document.getElementById('seedBtn').addEventListener('click', async () => {
      try {
        const seed = seedInput.value.trim();
        const size = sizeInput.value;

        if (!seed) {
          setOutput({ error: 'Please enter a seed first.' });
          return;
        }

        const result = await callApi('/debug/regenerate-map', 'POST', { seed, size });
        setOutput({ action: 'regenerate-map', ...result });

        if (result.status === 200) {
          state.cache.clear();
          state.centerX = 0;
          state.centerY = 0;
          await loadMapView(true);
        }
      } catch (error) {
        setOutput({ action: 'regenerate-map', error: error.message });
      }
    });

    zoomInput.addEventListener('input', () => {
      state.zoom = Number.parseInt(zoomInput.value, 10);
      applyZoom();
      if (state.zoom >= 3) {
        loadMapView(true);
      }
    });

    document.getElementById('leftBtn').addEventListener('click', () => moveBy(-3, 0));
    document.getElementById('rightBtn').addEventListener('click', () => moveBy(3, 0));
    document.getElementById('upBtn').addEventListener('click', () => moveBy(0, -3));
    document.getElementById('downBtn').addEventListener('click', () => moveBy(0, 3));

    toggleMapBtn.addEventListener('click', toggleMap);

    loadMapView(true);
  </script>
</body>
</html>`);
});

module.exports = router;
