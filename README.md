# Wargame X Backend Prototype

Minimal and extensible Node.js backend for the browser-based RTS prototype **Wargame X**.

This project currently includes:
- basic player registration/login
- deterministic seed-based procedural map generation with tile types
- base and force creation
- simple 1-second game loop tick
- debug web page for quick manual testing (including colorized map)

> No gameplay systems are implemented yet (no movement, no combat, no economy logic).

## Requirements

- Node.js **20.x LTS** (or newer LTS)
- npm

## Installation & Run

```bash
npm install
node server.js
```

Server starts on:
- `http://localhost:3000`

Note: server starts immediately and warms the initial map area in the background.

Useful pages:
- Health: `GET /health`
- Debug UI: `GET /debug`

## API Quick Start (Step by Step)

Use this flow:
1. Register
2. Login
3. Create base
4. Create force
5. View map

### 1) Register

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"player_one","password":"test123"}'
```

### 2) Login

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"player_one","password":"test123"}'
```

### 3) Create Base

Use the returned `player.id` as `playerId`.

```bash
curl -X POST http://localhost:3000/create-base \
  -H "Content-Type: application/json" \
  -d '{"playerId":1}'
```

### 4) Create Force

```bash
curl -X POST http://localhost:3000/create-force \
  -H "Content-Type: application/json" \
  -d '{"playerId":1}'
```

### 5) View Map

```bash
curl "http://localhost:3000/map?x=0&y=0&range=5"
```

## Endpoints

- `POST /register`
- `POST /login`
- `POST /create-base`
- `POST /create-force`
- `GET /map?x=0&y=0&range=5`
- `GET /health`
- `GET /debug`

## Tile Types

Current generated tile types:
- `normal`
- `wood`
- `rock`
- `water`

Biome generation is deterministic from `map.seed` in `src/config/index.js`.

## Testing

A minimal Node.js built-in test framework is included.

```bash
npm test
```

Tests currently cover deterministic biome generation and map query parsing behavior.
