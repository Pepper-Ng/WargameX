# Map Generation
Defines how the world is deterministically generated from a seed.

## Core principle
The world is generated using a **deterministic seed-based system**.
- A single seed defines an entire world.
- Generation is **pure and reproducible**.
- The same `(seed, x,  y)` always produces the same result.

## Generation model
### On-demand world generation
The world is not fully generated upfront. Instead, it is procedurally generated based on player activity, on an as-needed basis. This is possible because the world generation uses a seed-based generation algorithm.

Tiles are generated:
- When a player explores new coordinates.
- When a scan or similar mechanic reveals an area.
- When systems explicitly request map data.

This allows an infinite world size, efficient computation, and lazy expansion based on player activity

### Determinism invariant
- No randomness without seed input.
- No side effects during generation.
- Persistence only occurs after generation.

## Temperature model
Temperature is a primary driver of biome distributeion.

### Base gradient
- Temperature is higher near `y = 0` (equator).
- Temperature decreases as `|y|` increases.
- This creates large-scale climate bands.

### Noise variation
- Temperature is modified by seed-based noise.
- Prevents perfectly straight biome lines.
- Produces natural-looking transitions and irregularities.
> Result: temperature is a function of `(seed, y)`

## Biome generation
Biomes are determined primarily by:
- Temperature
- Seed-based noise

### Biome set
- `ocean`
- `desert`
- `jungle`
- `forest`
- `temperate`
- `tundra`
- `mountain`

### Biome characteristics
- Warmer regions -> desert, grassland
- Moderate regions -> forest
- Cold regions -> tundra, ice
- Water systems -> oceans and rivers

Biomes should form:
- Mostly large, continuous regions
- With slightly diverse scattering of other tile types
- With lower generation rate of tile types uncommon to a biome
- With natural transitions and irregular borders

## Tile type resolution
Tile types are derived from:
1. Biome
2. Local noise variation
3. Feature generators (e.g. rivers)

For specifics on tile types see [Map structure](./map-structure.md).

### Examples
* **Ocean biome**
  - Mostly `water`, occasional `plains` (islands) with occasional occurances of `wood`.
* **Desert biome**
  - Mostly `normal`, occasional `rock`, extremely rarely `water`.
* **Jungle biome**
  - Mostly `wood` and `swamp`, some `water` and `normal`
* **Forest biome**
  - Mostly `wood`, some `normal`, occasional `water`.
* **Tundra/Ice biome**
  - Mostly `ice`, some `normal`, occasional `rock`.
* **Mountain biome**
  - Mostly `mountain` and `rock`, some `ice`, occasional `plains`.

## Feature generation
### Rivers
- Generated using noise bands or flow algorithms
- Form long, connected `water` paths
- Can cross multiple biomes
- Turns into `ice` rivers in `Tundra/Ice` biomes when temperatures are low

### Local variation
Small-scale noise adds terrain diversity, imperfections and micro-features.

## Resource generation
Resource generation is biome-dependent. Each tile is initialized with deterministic resource generation rates. See [Resource generation](./resource-generation.md).

## Future sections
- Biome weight model
- Noise function and coordinate transforms
- Chunk/window generation strategy
- Regeneration safety and migration concerns
