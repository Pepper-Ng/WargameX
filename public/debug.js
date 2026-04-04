const state = {
  username: null,
  password: 'test123',
  playerId: null,
  mapVisible: true,
  centerX: 0,
  centerY: 0,
  zoom: 1,
  chunkSize: 16,
  chunkPrefetchRadius: 2,
  chunkCache: new Map(),
  mapState: null,
  highlightKey: null,
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
const statsTree = document.getElementById('statsTree');
const serverInfo = document.getElementById('serverInfo');

const colorsByType = {
  water: '#4f9cff',
  rock: '#9a9a9a',
  wood: '#3b8f3b',
  normal: '#d9c27a',
  edge: '#222',
};

function setOutput(data) {
  output.textContent = JSON.stringify(data, null, 2);
}

function updateUserLabel() {
  userLabel.textContent = state.username
    ? `${state.username} (id: ${state.playerId || 'unknown'})`
    : 'none';
}

function getTileSize() {
  return 12 * state.zoom;
}

function getVisibleTileCount() {
  return Math.max(5, Math.floor(600 / getTileSize()));
}

function keyForChunk(chunkX, chunkY) {
  return `${chunkX}:${chunkY}`;
}

function keyForTile(x, y) {
  return `${x}:${y}`;
}

function toChunkCoord(value) {
  return Math.floor(value / state.chunkSize);
}

function setServerInfo(data) {
  serverInfo.textContent = JSON.stringify(data, null, 2);
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

async function fetchChunk(chunkX, chunkY) {
  const key = keyForChunk(chunkX, chunkY);
  if (state.chunkCache.has(key)) return state.chunkCache.get(key);

  const result = await callApi(`/map/chunk?chunkX=${chunkX}&chunkY=${chunkY}&chunkSize=${state.chunkSize}`);
  if (result.status === 200) {
    state.chunkCache.set(key, result.data);
    state.mapState = result.data.mapState;
  }

  return result.data;
}

async function ensureChunksLoaded() {
  const visibleCount = getVisibleTileCount();
  const half = Math.floor(visibleCount / 2);
  const minX = state.centerX - half;
  const maxX = state.centerX + half;
  const minY = state.centerY - half;
  const maxY = state.centerY + half;

  const minChunkX = toChunkCoord(minX) - state.chunkPrefetchRadius;
  const maxChunkX = toChunkCoord(maxX) + state.chunkPrefetchRadius;
  const minChunkY = toChunkCoord(minY) - state.chunkPrefetchRadius;
  const maxChunkY = toChunkCoord(maxY) + state.chunkPrefetchRadius;

  const jobs = [];
  for (let cx = minChunkX; cx <= maxChunkX; cx += 1) {
    for (let cy = minChunkY; cy <= maxChunkY; cy += 1) {
      jobs.push(fetchChunk(cx, cy));
    }
  }

  await Promise.all(jobs);
}

function getTileFromCache(x, y) {
  const chunkX = toChunkCoord(x);
  const chunkY = toChunkCoord(y);
  const chunk = state.chunkCache.get(keyForChunk(chunkX, chunkY));
  if (!chunk) return null;

  return chunk.tiles.find((tile) => tile.x === x && tile.y === y) || null;
}

function drawMap() {
  const tileSize = getTileSize();
  const visibleCount = getVisibleTileCount();
  const half = Math.floor(visibleCount / 2);

  mapGrid.style.gridTemplateColumns = `repeat(${visibleCount}, ${tileSize}px)`;
  mapGrid.innerHTML = '';

  let edgeCount = 0;
  const showBaseMarkers = state.zoom >= 3;

  for (let y = state.centerY - half; y <= state.centerY + half; y += 1) {
    for (let x = state.centerX - half; x <= state.centerX + half; x += 1) {
      const tile = getTileFromCache(x, y);
      const div = document.createElement('div');
      div.className = 'tile';
      div.style.width = `${tileSize}px`;
      div.style.height = `${tileSize}px`;

      if (!tile) {
        div.style.backgroundColor = '#000';
        mapGrid.appendChild(div);
        continue;
      }

      div.style.backgroundColor = colorsByType[tile.tileType] || '#fff';

      if (tile.isEdge) {
        div.classList.add('edge');
        edgeCount += 1;
      }

      const baseForce = tile.forces.find((force) => force.type === 'base');
      if (showBaseMarkers && baseForce) {
        div.classList.add('base');
        div.title = `Base at (${tile.x}, ${tile.y}) owned by ${baseForce.owner_username}`;
      } else {
        div.title = `x=${tile.x}, y=${tile.y}, type=${tile.tileType}`;
      }

      if (state.highlightKey === keyForTile(x, y)) {
        div.style.outline = '2px solid #ff00ff';
      }

      mapGrid.appendChild(div);
    }
  }

  zoomLabel.textContent = `${state.zoom}x`;
  edgeHint.textContent = edgeCount > 0
    ? 'Reached map edge. Dark striped tiles indicate the end of generated terrain.'
    : 'Inside generated terrain.';
}

function clampCenter(nextX, nextY) {
  if (!state.mapState) return { x: nextX, y: nextY };

  const visible = getVisibleTileCount();
  const half = Math.floor(visible / 2);
  const edgeBuffer = 3;
  return {
    x: Math.max(state.mapState.min_x + half - edgeBuffer, Math.min(state.mapState.max_x - half + edgeBuffer, nextX)),
    y: Math.max(state.mapState.min_y + half - edgeBuffer, Math.min(state.mapState.max_y - half + edgeBuffer, nextY)),
  };
}

async function refreshViewport() {
  await ensureChunksLoaded();
  drawMap();
}

async function moveBy(dx, dy) {
  const next = clampCenter(state.centerX + dx, state.centerY + dy);
  state.centerX = next.x;
  state.centerY = next.y;
  state.highlightKey = null;

  // draw immediately from cache for smooth feel, then preload missing chunks.
  drawMap();
  await refreshViewport();
}

function renderStatsTree(players) {
  statsTree.innerHTML = '';

  for (const player of players) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `${player.username} (id:${player.id})`;
    details.appendChild(summary);

    const basesTitle = document.createElement('div');
    basesTitle.textContent = `Bases (${player.bases.length})`;
    details.appendChild(basesTitle);

    for (const base of player.bases) {
      const baseItem = document.createElement('div');
      baseItem.className = 'clickable';
      baseItem.textContent = `Base #${base.id} @ (${base.x}, ${base.y})`;
      baseItem.addEventListener('click', async () => {
        state.centerX = base.x;
        state.centerY = base.y;
        state.highlightKey = keyForTile(base.x, base.y);
        await refreshViewport();
      });
      details.appendChild(baseItem);
    }

    const forcesTitle = document.createElement('div');
    forcesTitle.textContent = `Forces (${player.forces.length})`;
    details.appendChild(forcesTitle);

    for (const force of player.forces) {
      const forceItem = document.createElement('div');
      forceItem.textContent = `Force #${force.id} @ (${force.x}, ${force.y})`;
      details.appendChild(forceItem);
    }

    statsTree.appendChild(details);
  }
}

async function loadStats() {
  const result = await callApi('/debug/stats');
  if (result.status === 200) {
    state.chunkPrefetchRadius = result.data.serverParameters.chunkPrefetchRadius;
    renderStatsTree(result.data.players);
    setServerInfo(result.data);
  }
}

async function reloadView() {
  state.zoom = 1;
  zoomInput.value = '1';
  state.centerX = 0;
  state.centerY = 0;
  state.highlightKey = null;
  state.chunkCache.clear();
  await refreshViewport();
}

function toggleMap() {
  state.mapVisible = !state.mapVisible;
  mapContainer.style.display = state.mapVisible ? 'block' : 'none';
  toggleMapBtn.textContent = state.mapVisible ? 'Hide Map' : 'Show Map';
}

document.getElementById('registerBtn').addEventListener('click', async () => {
  state.username = `player_${Math.random().toString(36).slice(2, 8)}`;
  const result = await callApi('/register', 'POST', { username: state.username, password: state.password });
  state.playerId = result.data.player && result.data.player.id;
  updateUserLabel();
  setOutput({ action: 'register', ...result });
  await loadStats();
});

document.getElementById('loginBtn').addEventListener('click', async () => {
  if (!state.username) return;
  const result = await callApi('/login', 'POST', { username: state.username, password: state.password });
  state.playerId = result.data.player && result.data.player.id;
  updateUserLabel();
  setOutput({ action: 'login', ...result });
});

document.getElementById('baseBtn').addEventListener('click', async () => {
  if (!state.playerId) return;
  const result = await callApi('/create-base', 'POST', { playerId: state.playerId });
  setOutput({ action: 'create-base', ...result });
  await loadStats();
  await refreshViewport();
});

document.getElementById('forceBtn').addEventListener('click', async () => {
  if (!state.playerId) return;
  const result = await callApi('/create-force', 'POST', { playerId: state.playerId });
  setOutput({ action: 'create-force', ...result });
  await loadStats();
  await refreshViewport();
});

document.getElementById('refreshStatsBtn').addEventListener('click', loadStats);
document.getElementById('mapBtn').addEventListener('click', reloadView);

document.getElementById('seedBtn').addEventListener('click', async () => {
  const seed = seedInput.value.trim();
  const size = sizeInput.value;
  if (!seed) return;

  const result = await callApi('/debug/regenerate-map', 'POST', { seed, size });
  setOutput({ action: 'regenerate-map', ...result });
  if (result.status === 200) {
    state.chunkCache.clear();
    state.centerX = 0;
    state.centerY = 0;
    await loadStats();
    await refreshViewport();
  }
});

zoomInput.addEventListener('input', async () => {
  state.zoom = Number.parseInt(zoomInput.value, 10);
  await refreshViewport();
});

document.getElementById('leftBtn').addEventListener('click', () => moveBy(-1, 0));
document.getElementById('rightBtn').addEventListener('click', () => moveBy(1, 0));
document.getElementById('upBtn').addEventListener('click', () => moveBy(0, -1));
document.getElementById('downBtn').addEventListener('click', () => moveBy(0, 1));
toggleMapBtn.addEventListener('click', toggleMap);

(async () => {
  await loadStats();
  await refreshViewport();
})();
