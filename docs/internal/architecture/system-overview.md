# System Overview

## Runtime topology
- Node.js HTTP server (`server.js`) starts application and warmup tasks.
- Express app (`src/app.js`) wires middleware and routes.
- SQLite persistence under `src/db/*` and `src/models/*`.
- Domain services under `src/services/*`.
- Game systems under `src/engine/*`.
- Debug UI assets served from `public/*`.

## Layering
1. Routes: request parsing / response shaping.
2. Services: domain orchestration and business rules.
3. Models: SQL-level persistence operations.
4. DB/Engine/Utils: infrastructure and shared utilities.

## Operational notes
- Startup performs DB init/migrations and map warmup.
- Logging should flow through `src/utils/logger.js`.
- Deterministic map behavior is seed-driven.
