const zoomToTileSize = { 1: 12, 2: 20, 3: 30, 4: 40 };

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
  holdTimer: null,
  serverParamsLoaded: { chunkPrefetchRadius: 2, maxRangePerRequest: 20 },
};

const el = {
  output: document.getElementById('output'),
  userLabel: document.getElementById('userLabel'),
  mapGrid: document.getElementById('mapGrid'),
  mapContainer: document.getElementById('mapContainer'),
  toggleMapBtn: document.getElementById('toggleMapBtn'),
  seedInput: document.getElementById('seedInput'),
  sizeInput: document.getElementById('sizeInput'),
  zoomInput: document.getElementById('zoomInput'),
  zoomLabel: document.getElementById('zoomLabel'),
  edgeHint: document.getElementById('edgeHint'),
  statsTree: document.getElementById('statsTree'),
  serverInfo: document.getElementById('serverInfo'),
  logOutput: document.getElementById('logOutput'),
  prefetchInput: document.getElementById('prefetchInput'),
  maxRangeInput: document.getElementById('maxRangeInput'),
  xAxis: document.getElementById('xAxis'),
  yAxis: document.getElementById('yAxis'),
};

const colorsByType = { water: '#4f9cff', rock: '#9a9a9a', wood: '#3b8f3b', normal: '#d9c27a', edge: '#222' };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setOutput(data) {
  el.output.textContent = JSON.stringify(data, null, 2);
}

function getTileSize() {
  return zoomToTileSize[state.zoom];
}

function getVisibleTileCount() {
  return Math.floor(600 / getTileSize());
}

function viewBounds() {
  const count = getVisibleTileCount();
  const startX = state.centerX - Math.floor(count / 2);
  const startY = state.centerY - Math.floor(count / 2);
  return { count, startX, startY, endX: startX + count - 1, endY: startY + count - 1 };
}

function keyForChunk(chunkX, chunkY) { return `${chunkX}:${chunkY}`; }
function keyForTile(x, y) { return `${x}:${y}`; }
function toChunkCoord(v) { return Math.floor(v / state.chunkSize); }

function updateUserLabel() {
  el.userLabel.textContent = state.username ? `${state.username} (id: ${state.playerId || 'unknown'})` : 'none';
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
  const { startX, startY, endX, endY } = viewBounds();
  const minChunkX = toChunkCoord(startX) - state.chunkPrefetchRadius;
  const maxChunkX = toChunkCoord(endX) + state.chunkPrefetchRadius;
  const minChunkY = toChunkCoord(startY) - state.chunkPrefetchRadius;
  const maxChunkY = toChunkCoord(endY) + state.chunkPrefetchRadius;

  const jobs = [];
  for (let cx = minChunkX; cx <= maxChunkX; cx += 1) {
    for (let cy = minChunkY; cy <= maxChunkY; cy += 1) jobs.push(fetchChunk(cx, cy));
  }
  await Promise.all(jobs);
}

function getTileFromCache(x, y) {
  const chunk = state.chunkCache.get(keyForChunk(toChunkCoord(x), toChunkCoord(y)));
  if (!chunk) return null;
  return chunk.tiles.find((tile) => tile.x === x && tile.y === y) || null;
}

function drawAxes(startX, startY, count, tileSize) {
  el.xAxis.innerHTML = '';
  el.yAxis.innerHTML = '';

  for (let i = 0; i < count; i += 1) {
    const x = startX + i;
    const d = document.createElement('div');
    d.style.width = `${tileSize}px`;
    d.textContent = x;
    el.xAxis.appendChild(d);
  }

  el.yAxis.style.gridTemplateRows = `repeat(${count}, ${tileSize}px)`;
  for (let i = 0; i < count; i += 1) {
    const y = startY + i;
    const d = document.createElement('div');
    d.style.height = `${tileSize}px`;
    d.textContent = y;
    el.yAxis.appendChild(d);
  }
}

function drawMap() {
  const tileSize = getTileSize();
  const { count, startX, startY } = viewBounds();

  el.mapGrid.style.gridTemplateColumns = `repeat(${count}, ${tileSize}px)`;
  el.mapGrid.innerHTML = '';

  let edgeCount = 0;
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      const x = startX + col;
      const y = startY + row;
      const tile = getTileFromCache(x, y);
      const div = document.createElement('div');
      div.className = 'tile';
      div.style.width = `${tileSize}px`;
      div.style.height = `${tileSize}px`;

      if (!tile) {
        div.style.backgroundColor = '#000';
        el.mapGrid.appendChild(div);
        continue;
      }

      div.style.backgroundColor = colorsByType[tile.tileType] || '#fff';
      if (tile.isEdge) { div.classList.add('edge'); edgeCount += 1; }

      const baseForce = tile.forces.find((force) => force.type === 'base');
      if (baseForce) {
        div.classList.add('base');
        div.title = `Base at (${tile.x}, ${tile.y}) owned by ${baseForce.owner_username}`;
      } else {
        div.title = `x=${tile.x}, y=${tile.y}, type=${tile.tileType}`;
      }

      if (state.highlightKey === keyForTile(x, y)) div.style.outline = '2px solid #ff00ff';
      el.mapGrid.appendChild(div);
    }
  }

  drawAxes(startX, startY, count, tileSize);
  el.zoomLabel.textContent = `${state.zoom}x`;
  el.edgeHint.textContent = edgeCount > 0 ? 'Reached map edge.' : 'Inside generated terrain.';
}

function clampCenter(nextX, nextY) {
  if (!state.mapState) return { x: nextX, y: nextY };
  const half = Math.floor(getVisibleTileCount() / 2);
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

async function animateMove(dx, dy, tiles = 3) {
  for (let i = 0; i < tiles; i += 1) {
    const next = clampCenter(state.centerX + dx, state.centerY + dy);
    if (next.x === state.centerX && next.y === state.centerY) break;
    state.centerX = next.x;
    state.centerY = next.y;
    drawMap();
    await ensureChunksLoaded();
    await sleep(45);
  }
  drawMap();
}

function bindHoldScroll(buttonId, dx, dy) {
  const btn = document.getElementById(buttonId);
  btn.addEventListener('click', () => animateMove(dx, dy, 3));
  btn.addEventListener('mousedown', () => {
    clearInterval(state.holdTimer);
    state.holdTimer = setInterval(() => animateMove(dx, dy, 1), 120);
  });
  btn.addEventListener('mouseup', () => clearInterval(state.holdTimer));
  btn.addEventListener('mouseleave', () => clearInterval(state.holdTimer));
}

function renderStatsTree(players) {
  el.statsTree.innerHTML = '';
  for (const player of players) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `${player.username} (id:${player.id})`;
    details.appendChild(summary);

    for (const base of player.bases) {
      const row = document.createElement('div');
      row.className = 'inline-actions';
      row.innerHTML = `<span class="clickable">Base #${base.id} @ (${base.x}, ${base.y})</span> <button data-base="${base.id}">Delete</button>`;
      row.querySelector('.clickable').addEventListener('click', async () => {
        state.centerX = base.x;
        state.centerY = base.y;
        state.highlightKey = keyForTile(base.x, base.y);
        await refreshViewport();
      });
      row.querySelector('button').addEventListener('click', async () => {
        await callApi(`/debug/base/${base.id}`, 'DELETE');
        await loadStats();
        await refreshViewport();
      });
      details.appendChild(row);
    }

    for (const force of player.forces) {
      const row = document.createElement('div');
      row.className = 'inline-actions';
      row.innerHTML = `Force #${force.id} @ (${force.x}, ${force.y}) <button data-force="${force.id}">Delete</button>`;
      row.querySelector('button').addEventListener('click', async () => {
        await callApi(`/debug/force/${force.id}`, 'DELETE');
        await loadStats();
        await refreshViewport();
      });
      details.appendChild(row);
    }

    el.statsTree.appendChild(details);
  }
}

async function loadStats() {
  const result = await callApi('/debug/stats');
  if (result.status !== 200) return;

  state.chunkPrefetchRadius = result.data.serverParameters.chunkPrefetchRadius;
  state.serverParamsLoaded = {
    chunkPrefetchRadius: result.data.serverParameters.chunkPrefetchRadius,
    maxRangePerRequest: result.data.serverParameters.maxRangePerRequest,
  };
  el.prefetchInput.value = result.data.serverParameters.chunkPrefetchRadius;
  el.maxRangeInput.value = result.data.serverParameters.maxRangePerRequest;
  el.serverInfo.textContent = JSON.stringify(result.data, null, 2);
  renderStatsTree(result.data.players);
}

async function loadLogs() {
  const result = await callApi('/debug/logs');
  if (result.status === 200) {
    el.logOutput.textContent = result.data.logs || '';
    el.logOutput.scrollTop = el.logOutput.scrollHeight;
  }
}

async function reloadView() {
  state.zoom = 1;
  el.zoomInput.value = '1';
  state.centerX = 0;
  state.centerY = 0;
  state.highlightKey = null;
  state.chunkCache.clear();
  await refreshViewport();
}

document.getElementById('paramsBtn').addEventListener('click', async () => {
  const updates = {};
  const newPrefetch = Number.parseInt(el.prefetchInput.value, 10);
  const newRange = Number.parseInt(el.maxRangeInput.value, 10);

  if (newPrefetch !== state.serverParamsLoaded.chunkPrefetchRadius) updates.chunkPrefetchRadius = newPrefetch;
  if (newRange !== state.serverParamsLoaded.maxRangePerRequest) updates.maxRangePerRequest = newRange;

  if (Object.keys(updates).length === 0) {
    setOutput({ action: 'update-server-params', message: 'No parameter changes detected.' });
    return;
  }

  const result = await callApi('/debug/server-params', 'PUT', updates);
  setOutput({ action: 'update-server-params', ...result });
  await loadStats();
});

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

document.getElementById('seedBtn').addEventListener('click', async () => {
  const seed = el.seedInput.value.trim();
  if (!seed) return;
  const result = await callApi('/debug/regenerate-map', 'POST', { seed, size: el.sizeInput.value });
  setOutput({ action: 'regenerate-map', ...result });
  if (result.status === 200) {
    state.chunkCache.clear();
    state.centerX = 0;
    state.centerY = 0;
    await loadStats();
    await refreshViewport();
  }
});

document.getElementById('refreshStatsBtn').addEventListener('click', loadStats);
document.getElementById('refreshLogsBtn').addEventListener('click', loadLogs);
document.getElementById('mapBtn').addEventListener('click', reloadView);
document.getElementById('zoomInBtn').addEventListener('click', async () => {
  state.zoom = Math.min(4, state.zoom + 1);
  el.zoomInput.value = String(state.zoom);
  await refreshViewport();
});
document.getElementById('zoomOutBtn').addEventListener('click', async () => {
  state.zoom = Math.max(1, state.zoom - 1);
  el.zoomInput.value = String(state.zoom);
  await refreshViewport();
});
el.zoomInput.addEventListener('input', async () => {
  state.zoom = Number.parseInt(el.zoomInput.value, 10);
  await refreshViewport();
});

bindHoldScroll('leftBtn', -1, 0);
bindHoldScroll('rightBtn', 1, 0);
bindHoldScroll('upBtn', 0, -1);
bindHoldScroll('downBtn', 0, 1);

document.getElementById('toggleMapBtn').addEventListener('click', () => {
  state.mapVisible = !state.mapVisible;
  el.mapContainer.style.display = state.mapVisible ? 'block' : 'none';
  el.toggleMapBtn.textContent = state.mapVisible ? 'Hide Map' : 'Show Map';
});

(async () => {
  await loadStats();
  await loadLogs();
  await refreshViewport();
  setInterval(loadLogs, 3000);
})();
