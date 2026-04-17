# Wargame X Backend Prototype

Minimal and extensible Node.js backend for the browser-based wargame prototype **Wargame X**.

This project currently includes:
- basic player registration/login
- deterministic seed-based procedural map generation with tile types
- base and force creation
- simple 1-second game loop tick
- debug web page for quick manual testing (including colorized map)

> No gameplay systems are implemented yet (no movement, no combat, no economy logic).


## Documentation

A structured docs tree is available under `docs/`:
- Public gameplay guide: `docs/public/gameplay-guide.md`
- Internal technical docs index: `docs/internal/README.md`
- Game mechanics: `docs/internal/mechanics/README.md`

Mechanics (including fundamentals/world/economy/combat/units/buildings) and architecture notes live in the internal docs tree.

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
- `GET /map/chunk?chunkX=0&chunkY=0&chunkSize=16`
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


## Debug Seed Regeneration

On `/debug`, use **Regenerate Map With Seed** to reset generated tiles with a new deterministic seed.

## Logs

Startup and runtime logs are timestamped and written to:
- `logs/server.log`


## Debug Map Viewer Controls

The `/debug` page includes:
- zoom slider (1x-4x)
- directional scroll buttons (no page refresh)
- base markers at higher zoom levels
- seed + map size regeneration inputs
- edge-tile indication when you reach generated map boundaries


Chunk endpoint is intended for efficient windowed prefetch and smoother map scrolling in the debug UI.


## Database Migrations

Database schema version is tracked in `schema_migrations`.
Migrations run automatically at server startup from `src/db/migrations/`.

## Debug Stats

`GET /debug/stats` returns:
- server parameters
- current map settings
- database schema version
- players tree with bases and forces
