# Map Structure

Defines the canonical world tile model and coordinate semantics.

## Tile as the atomic world unit
A tile is the smallest addressable world element used for generation, persistence, and map rendering.

### Conceptual tile fields
- `x`, `y`: integer world coordinates.
- `tileType`: biome/material class (for example normal, wood, rock, water).
- `passable`: movement eligibility flag (provisional for future movement rules).
- `resourceTags`: optional descriptors used by economy/resource systems (provisional).
- `occupants`: entities currently on tile (bases, forces, future structures).
- `meta`: optional generated/debug metadata.

## Coordinate system
- Origin-centered integer grid (`x`, `y`) with no floating-point positions at tile level.
- Query windows are centered around a coordinate and include a range/chunk extent.
- Same coordinate under the same seed must always resolve to the same generated terrain.

## Tile types (current)
Current generated terrain classes:
- `normal`
- `wood`
- `rock`
- `water`

## What can exist on a tile
- Terrain classification (always).
- Zero or one base at a coordinate (current gameplay assumption).
- Zero or more forces depending on future movement/stacking rules.
- Future world objects (buildings/resources/events), to be constrained by mechanics docs.

## Notes
This file is a contract-level description and should remain aligned with backend persistence and debug rendering behavior.
