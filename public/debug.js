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
  return `${x}:${y}:${range}`;
}

function setOutput(data) {
  output.textContent = JSON.stringify(data, null, 2);
  output.scrollTop = 0;
}

function updateUserLabel() {
  userLabel.textContent = state.username
    ? `${state.username} (id: ${state.playerId || 'unknown'})`
    : 'none';
}

function applyZoom() {
  const tileSize = 12 * state.zoom;
  mapGrid.style.gridTemplateColumns = `repeat(${state.range * 2 + 1}, ${tileSize}px)`;
  for (const tile of mapGrid.children) {
    tile.style.width = `${tileSize}px`;
    tile.style.height = `${tileSize}px`;
  }
  zoomLabel.textContent = `${state.zoom}x`;
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
      div.title = `Base at (${tile.x}, ${tile.y}) owned by ${baseForce.owner_username}`;
    } else {
      div.title = `x=${tile.x}, y=${tile.y}, type=${tile.tileType}`;
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

  const result = await callApi(`/map?x=${x}&y=${y}&range=${range}`);
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
    state.username = `player_${Math.random().toString(36).slice(2, 8)}`;
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
