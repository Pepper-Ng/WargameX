# AGENTS.md

Guidance for future agents working in this repository.

## Project Purpose
Wargame X is a minimal Node.js backend prototype for a browser RTS. Keep architecture simple and extensible.

## Current Architecture
- `server.js`: startup orchestration.
- `src/app.js`: Express app + route registration + error middleware.
- `src/db/*`: SQLite access + schema + map warmup/regeneration.
- `src/models/*`: SQL persistence functions.
- `src/services/*`: domain logic.
- `src/routes/*`: HTTP handlers.
- `src/engine/*`: game loop and biome generation.
- `src/utils/*`: helpers (password, parsing, logging, settings).

## Logging Rules
- Use `src/utils/logger.js` for logs (not raw `console.log` in new code).
- Startup logs should use `Startup` scope and include clear start/finish messages.
- Logs are timestamped and appended to `logs/server.log`.

## Map / Biome Notes
- Biome generation is deterministic and seed-based.
- Active seed is read via `src/utils/mapSettings.js`.
- `/debug` has a map regeneration endpoint (`POST /debug/regenerate-map`) that resets map tiles with a provided seed.
- Initial warmup area is generated in the background at startup to keep startup responsive.

## Debug Page Notes
- `/debug` renders a 41x41 tile view (`range=20`) with dynamic zoom (1x..4x).
- At zoom >= 3, base markers are shown and tile hover includes base owner details.
- Scroll buttons move the map without page refresh and use cached/prefetched tiles.
- Edge tiles indicate generated-map boundaries; UI allows showing up to ~3 edge tiles at boundaries.
- Console output area is fixed-height with scroll.

## Development Notes
- Keep gameplay systems out unless explicitly requested (movement/combat/economy are future work).
- Prefer small, readable async functions.
- If changing startup or map generation behavior, update README and tests.

## Testing
- Run:
  - `npm test`
  - `npm run check`
- Tests currently use Node built-in test runner (`node:test`).
- Add tests for new deterministic helpers and route parsing behavior when possible.
