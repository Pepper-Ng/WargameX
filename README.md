# Wargame X Backend Prototype

Minimal and extensible Node.js backend for the browser-based RTS prototype **Wargame X**.

This project currently includes:
- basic player registration/login
- procedural map tile generation
- base and force creation
- simple 1-second game loop tick
- debug web page for quick manual testing

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

Example response:

```json
{
  "player": {
    "id": 1,
    "username": "player_one",
    "created_at": "2026-01-01 00:00:00"
  }
}
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

## Debug Web Page

Open `http://localhost:3000/debug` in your browser.

Buttons provided:
- Register (random username)
- Login
- Create Base
- Create Force
- Load Map

Results are displayed as formatted JSON in a `<pre>` block for easy inspection.
