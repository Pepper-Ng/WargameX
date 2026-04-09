# Map Structure

Defines the canonical world tile model and coordinate semantics.

## Tile as the atomic world unit
A tile is the smallest addressable world element used for generation, persistence, and map rendering.\
A tile represents a single coordinate in the world and is the fundamental unit shared across all systems.

### Conceptual tile fields
- `x`, `y`: integer world coordinates.
- `temperature`: temperature of the tile. Depends on seed and y-coordinate.
- `tileType`: terrain/material classification (for example normal, wood, rock, water).
- `biome`: higher-level environmental classification (e.g. forest, desert, tundra, ocean).
- `passableBy`: movement eligibility flag (provisional).
- `resourceTags`: optional descriptors used by economy/resource systems (provisional).
- `occupants`: entities currently on tile (bases, forces, future structures).
- `meta`: optional generated/debug metadata.

## Coordinate system
- Origin-centered integer grid (`x`, `y`).
- No floating-point positions at tile level.
- `y = 0` represents the equatorial band (highest temperature baseline).
- Negative and positive `y` move toward colder regions.
- Query windows are centered around a coordinate and include a range/chunk extent.
- Same coordinate under the same seed must always resolve to the same generated terrain.

## Determinism invariant
- The same `(seed, x, y)` must always resolve to the same tile state (unless explicitly regenerated).

## Tile types (current)
Current generated terrain classes:
- `normal`
- `wood`
- `rock`
- `water`
- `ice`
> Note: Tile types are derived from biome + local variation, not generated independently.

## What can exist on a tile
- Terrain classification (always present).
- Zero or one base force.
- Zero or more forces depending on movement/stacking rules.

## Notes
This document defines the **world contract** and must remain aligned with:
* Generation logic
* Persistence model
* Rendering systems
