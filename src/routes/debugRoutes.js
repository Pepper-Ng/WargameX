const express = require('express');

const router = express.Router();

router.get('/debug', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wargame X Debug</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; max-width: 980px; }
    button { margin: 4px 8px 4px 0; padding: 8px 12px; }
    pre { background: #111; color: #0f0; padding: 12px; border-radius: 6px; white-space: pre-wrap; min-height: 200px; }
    .row { margin-bottom: 10px; }
    #mapGrid { display: grid; grid-template-columns: repeat(11, 24px); gap: 2px; margin-top: 10px; }
    .tile { width: 24px; height: 24px; border-radius: 2px; border: 1px solid #999; }
    .legend { display: flex; gap: 12px; margin-top: 8px; font-size: 14px; }
    .legend span { display: inline-flex; align-items: center; gap: 4px; }
    .swatch { width: 12px; height: 12px; border: 1px solid #666; display: inline-block; }
  </style>
</head>
<body>
  <h1>Wargame X Debug Page</h1>
  <p>Simple browser tools for interacting with backend endpoints.</p>

  <div class="row">
    <button id="registerBtn">Register (random)</button>
    <button id="loginBtn">Login</button>
    <button id="baseBtn">Create Base</button>
    <button id="forceBtn">Create Force</button>
    <button id="mapBtn">Load Map</button>
  </div>

  <div class="row">
    <strong>Current user:</strong> <span id="userLabel">none</span>
  </div>

  <pre id="output">Ready.</pre>
  <div id="mapGrid"></div>
  <div class="legend">
    <span><i class="swatch" style="background:#4f9cff"></i>water</span>
    <span><i class="swatch" style="background:#9a9a9a"></i>rock</span>
    <span><i class="swatch" style="background:#3b8f3b"></i>wood</span>
    <span><i class="swatch" style="background:#d9c27a"></i>normal</span>
  </div>

  <script>
    const state = {
      username: null,
      password: 'test123',
      playerId: null,
    };

    const output = document.getElementById('output');
    const userLabel = document.getElementById('userLabel');
    const mapGrid = document.getElementById('mapGrid');

    const colorsByType = {
      water: '#4f9cff',
      rock: '#9a9a9a',
      wood: '#3b8f3b',
      normal: '#d9c27a',
    };

    function setOutput(data) {
      output.textContent = JSON.stringify(data, null, 2);
    }

    function updateUserLabel() {
      userLabel.textContent = state.username
        ? state.username + ' (id: ' + (state.playerId || 'unknown') + ')'
        : 'none';
    }

    function drawMap(tiles) {
      mapGrid.innerHTML = '';
      for (const tile of tiles) {
        const div = document.createElement('div');
        div.className = 'tile';
        div.style.backgroundColor = colorsByType[tile.tileType] || '#ffffff';
        div.title = 'x=' + tile.x + ', y=' + tile.y + ', type=' + tile.tileType;
        mapGrid.appendChild(div);
      }
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
      } catch (error) {
        setOutput({ action: 'create-force', error: error.message });
      }
    });

    document.getElementById('mapBtn').addEventListener('click', async () => {
      try {
        const result = await callApi('/map?x=0&y=0&range=5');
        if (result.status === 200 && result.data.tiles) {
          drawMap(result.data.tiles);
        }
        setOutput({ action: 'map', ...result });
      } catch (error) {
        setOutput({ action: 'map', error: error.message });
      }
    });
  </script>
</body>
</html>`);
});

module.exports = router;
