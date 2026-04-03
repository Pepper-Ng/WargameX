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
    body { font-family: Arial, sans-serif; margin: 20px; max-width: 800px; }
    button { margin: 4px 8px 4px 0; padding: 8px 12px; }
    pre { background: #111; color: #0f0; padding: 12px; border-radius: 6px; white-space: pre-wrap; }
    .row { margin-bottom: 10px; }
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

  <script>
    const state = {
      username: null,
      password: 'test123',
      playerId: null,
    };

    const output = document.getElementById('output');
    const userLabel = document.getElementById('userLabel');

    function setOutput(data) {
      output.textContent = JSON.stringify(data, null, 2);
    }

    function updateUserLabel() {
      userLabel.textContent = state.username
        ? state.username + ' (id: ' + (state.playerId || 'unknown') + ')'
        : 'none';
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
        const result = await callApi('/map?x=0&y=0&range=2');
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
