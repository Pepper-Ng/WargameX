
# Map Structure

The world of Wargame X is built from **tiles** — discrete grid cells that each carry terrain, resources, and any structures or forces present. This document covers the tile model, coordinate system, and how biomes and tile types relate to one another.

---

## Tiles

A **tile** is the smallest addressable world element, identified by its `(x, y)` integer coordinate. Every aspect of the game world — generation, persistence, rendering — operates at tile granularity.

Tile properties fall into two categories:

### Static Properties

Derived deterministically from `(seed, x, y)` — the same inputs always produce the same result:

- `x`, `y` — Integer world coordinates
- `biome` — Environmental zone (see [Biomes](#biomes))
- `tileType` — Terrain classification (see [Tile Types](#tile-types))
- `temperature` — Derived from latitude and noise
- `resourceRates` — Per-resource generation rates
- `passableBy` — Movement eligibility per unit type (planned)

### Dynamic Properties

Change at runtime and must be persisted:

- `resourceAmounts` — Current stored resources, per type
- `occupants` — Entities present: bases, forces, structures
- `meta` — Optional debug metadata

---

## Coordinate System

The world uses an origin-centred integer grid. `y = 0` is the equatorial band and the warmest region; increasing `|y|` moves toward colder biomes. Map queries are expressed as windows centred on a coordinate with a specified range.

---

## Biomes

Biomes are large-scale environmental zones that shape which tile types appear locally and how abundant resources are. Each biome specialises in one or two resources, creating strategic variety and rewarding territorial expansion.

| Biome     | Description                        |
|-----------|------------------------------------|
| Ocean     | Deep water, islands                |
| Desert    | Hot, arid, sandy                   |
| Jungle    | Dense, humid, lush                 |
| Forest    | Temperate, wooded                  |
| Temperate | Mixed grassland and forest         |
| Tundra    | Cold, sparse, icy                  |
| Mountain  | High elevation, rocky, cold        |

Biome selection is driven by latitude and seed-based noise, producing irregular, natural-looking boundaries. See [Map Generation](./map-generation.md) for the biome weight model and distribution tables.

---

## Tile Types

Tile type is the local terrain classification within a biome. It determines base resource rates and whether a tile can be built on or traversed.

| Tile Type | Description                        |
|-----------|------------------------------------|
| Plains    | Grassland, fertile                 |
| Sand      | Dunes, arid                        |
| Forest    | Trees, wooded                      |
| Swamp     | Wetland, marsh                     |
| Rock      | Rocky, mineral-rich                |
| Mountain  | Steep, mineral-rich                |
| Water     | Shallow or deep water              |
| Oil       | Oil field, tar sands               |
| Ice       | Frozen, permafrost                 |

Each biome has a weighted probability distribution over tile types. Some types (e.g. `Oil`, `Water`) are rare outside their native biome. Full distribution tables are in [Map Generation](./map-generation.md).

---

## What Can Exist on a Tile

- A terrain classification (always present)
- Zero or one base structure
- Zero or more forces, subject to stacking and movement rules
- A stored amount of each resource, bounded by the tile's capacity

---

## Resources

The four resource types are **carbon**, **iron**, **crystal**, and **oil**. Each tile generates resources at rates determined by its type, biome, and coordinates. The amount currently stored on a tile fluctuates as resources regenerate and are extracted.

The `resourceRates` field carries the per-tick generation rate for each resource:

```json
{
  "carbon": 5.95,
  "iron": 6.545,
  "crystal": 0.0,
  "oil": 1.2
}
```

Rates are fully determined by `(seed, x, y)`, tile type, and biome. For the generation formulas, base ranges, biome multipliers, capacity rules, and extraction mechanics, see [Resource Generation](./resource-generation.md).

---

## Edge Cases

- Tiles at biome boundaries use the dominant biome for type selection and resource bonuses.
- A tile with a zero generation rate for a resource never produces that resource.
- Some tile types (e.g. `Water`, `Oil`) are not buildable. Extractors may operate from an adjacent tile at a small efficiency penalty — see [Resource Generation](./resource-generation.md).

---

## Glossary

- **tile** — The smallest world unit, identified by `(x, y)`.
- **biome** — Large-scale environmental zone shaping tile type distribution and resource abundance.
- **tileType** — Local terrain classification determining base resource rates and passability.
- **resourceRates** — Per-resource generation rate (units/tick). Deterministic; does not need to be persisted.
- **resourceAmounts** — Stored resource amount per type. Changes each tick; must be persisted.
- **capacity** — Maximum storable units of a resource on a tile. See [Resource Generation](./resource-generation.md).
- **passableBy** — Flags determining which unit types may move through a tile (planned).
- **occupants** — Entities currently present on a tile.

