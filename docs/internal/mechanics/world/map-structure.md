# Map Structure

Defines the canonical world tile model and coordinate semantics.

## Tile as the atomic world unit
A tile is the smallest addressable world element used for generation, persistence, and map rendering.\
A tile represents a single coordinate in the world and is the fundamental unit shared across all systems.

### Tile fields
Tile properties are divided into **static** and **dynamic** fields. Static fields are fully determined by `(seed, x, y)` and must always resolve identically. Static properties can always be recomputed. Dynamic properties change over time.

**Static properties:**
- `x`, `y`: integer world coordinates.
- `biome`: higher-level environmental classification (e.g. forest, desert, tundra, ocean).
- `tileType`: terrain/material classification (for example normal, wood, rock, water).
- `temperature`: temperature of the tile. Depends on seed and y-coordinate.
- `resourceRates`: generation rates per resource type.
- `passableBy`: movement eligibility flag (provisional).

**Dynamic properties:**
- `resourceAmounts`: currently available resources on the tile.
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
- The same `(seed, x, y)` must always resolve to the same tile `static properties` (unless explicitly regenerated).
- For **map and tile generation** see [Map generation](./map-generation.md)

## Tile types (current)
Current generated terrain classes:
- `normal`
- `wood`
- `rock`
- `water`
- `ice`
> Tile types are deterministically derived from `(seed, x, y)` through biome classification and local variation. They are not generated as an independent random step.

## What can exist on a tile
- Terrain classification (always present).
- Zero or one base force.
- Zero or more forces depending on movement/stacking rules.

## Notes
This document defines the **world contract** and must remain aligned with:
* Generation logic
* Persistence model
* Rendering systems
