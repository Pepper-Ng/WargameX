
# Map Generation

The world is built tile by tile from a single seed, using layered noise to determine temperature, biome, and terrain. This document explains how that process works — from latitude bands and biome weights through to tile type resolution and feature generation.

## Core Principle

The world is generated through a **deterministic, seed-based system**. A single seed defines the entire world, generation remains pure and reproducible, and the same `(seed, x, y)` always produces the same result. Generation has no side effects; tiles are persisted only after they are produced.

---

## Generation Model

### On-Demand World Generation
Infinite world size is supported by lazy, chunk-based expansion. The world is generated procedurally as needed during exploration, scanning, or other system requests, and every result is derived from the world seed rather than from runtime randomness.

---

## The Generation Pipeline

1. A tile request arrives at `(seed, x, y)`, which fully defines the static generation inputs for that tile. Static tile properties are derived directly from those inputs, so no prior world state is required to compute them.

2. Temperature is computed as

$$
T = \text{clamp}(T_{\text{eq}} - k \cdot |y| + A_{\text{temp}} \cdot u_{\text{temp}},\ 0,\ 1)
$$

where $u_{\text{temp}} \in [0,1]$ is value noise sampled at `freq_temp = 0.02`. This creates a strong latitudinal gradient while softening it with low-frequency irregularity.

3. The two nearest latitude anchor bands are identified and blended into a per-tile biome weight vector. With anchors spaced every 20 tiles, the interpolation fraction is

$$
t = \frac{|y| - y_{\text{lo}}}{20}
$$

so a latitude between Mid and High inherits a smooth linear blend of those two rows.

4. Feature signals are then sampled from river noise and elevation noise fields. A strong river contour forces the tile to Water, while elevation above the mountain threshold forces the biome to Mountain.

5. Biome is resolved by a cumulative weighted draw using $r = \text{hash2d}(x, y, \text{seed}+\text{":biome"})$ against the interpolated biome weights. Feature overrides take precedence over that draw.

6. Tile type is resolved by a second weighted draw from the selected biome's tile-type distribution row, using $r = \text{hash2d}(x, y, \text{seed}+\text{":tiletype"})$. This keeps biome identity and surface composition deterministic but decorrelated.

7. A high-frequency local variation pass refines the base result with small micro-features. This final pass preserves the large-scale biome structure while preventing repetitive local patterns.

8. Resource rates are computed deterministically from the resolved biome and tile type, as described in [Resource Generation](./resource-generation.md). Resource output therefore follows from the same seed-derived world state as the terrain itself.

9. The tile is persisted after generation. Subsequent reads return the stored result, preserving consistency between first discovery and later access.

---

## Temperature Model

Temperature is the primary driver of biome distribution.

### Base Gradient
- Temperature is highest at `y = 0` (equator).
- Temperature decreases as $|y|$ increases (toward poles).
- Temperature follows the base formula:

$$
T = \text{clamp}(T_{\text{eq}} - k \cdot |y| + A_{\text{temp}} \cdot u_{\text{temp}},\ 0,\ 1)
$$

where $T_{\text{eq}}$ is equatorial temperature, $k$ is the gradient constant, $A_{\text{temp}}$ is the temperature noise amplitude, and $u_{\text{temp}}$ is normalized seed-derived noise.

| Constant | Value | Notes |
|---|---|---|
| $T_{\text{eq}}$ | 1.0 | Normalized equatorial temperature |
| $k$ | 0.015 per tile | Gradient rate toward poles |
| $A_{\text{temp}}$ | 0.12 | Noise amplitude on T |
| `freq_temp` | 0.02 | Spatial frequency (already in Noise Parameters) |

| Latitude band | $\|y\|$ | Base $T$ |
|---|---|---|
| Equator | 0 | 1.00 |
| Mid | ±20 | 0.70 |
| High | ±40 | 0.40 |
| Polar | ±60+ | 0.10 |

These base values are warped by noise with amplitude 0.12, so biome boundaries shift by up to roughly 8 tiles and form natural irregular edges.

### Noise Variation
- Seed-based noise is added to temperature to create irregular biome boundaries.
- Prevents straight lines and creates natural transitions.

The temperature value $T$ determines which two anchor bands in the biome weight table are blended. A tile at $|y| = 30$ sits halfway between the Mid (±20) and High (±40) anchors, so its weight vector is the average of those two rows. This approach lets $T$'s noise perturbation naturally shift biome boundaries without separate logic.

---

## Biome Generation

Biomes are determined by:
- Temperature (primary)
- Seed-based noise (secondary)
- Feature generators (e.g., rivers, mountains)

The world's seven biomes are described fully in [Map Structure](./map-structure.md).

### Biome Weight Model

Each latitude band (`y`) has a **biome weight vector** specifying the probability of each biome, modulated by noise and features.

| Latitude Band (y) | Ocean | Desert | Jungle | Forest | Temperate | Tundra | Mountain |
|-------------------|-------|--------|--------|--------|-----------|--------|----------|
| Equator (0)       | 0.10  | 0.30   | 0.25   | 0.10   | 0.10      | 0.00   | 0.15     |
| Mid (±20)         | 0.10  | 0.20   | 0.15   | 0.20   | 0.20      | 0.05   | 0.10     |
| High (±40)        | 0.15  | 0.05   | 0.05   | 0.20   | 0.25      | 0.20   | 0.10     |
| Polar (±60+)      | 0.20  | 0.00   | 0.00   | 0.10   | 0.10      | 0.50   | 0.10     |

Biome selection within a band is a deterministic weighted draw from `(seed, x, y)`, with noise applied before sampling. Feature generators such as rivers and mountain ranges can override the result.

### Band Interpolation and Biome Draw

The biome weight table has four discrete anchor points; real coordinates require smooth interpolation between them. For a tile at $|y|$:

$$
y_{\text{lo}} = \left\lfloor |y| / 20 \right\rfloor \times 20, \quad t = \frac{|y| - y_{\text{lo}}}{20}
$$

The weight vector $\mathbf{w}$ is the element-wise linear blend of the two nearest anchor rows:

$$
\mathbf{w} = (1-t) \cdot \mathbf{w}_{y_{\text{lo}}} + t \cdot \mathbf{w}_{y_{\text{lo}}+20}
$$

Biome is then selected by a deterministic weighted draw: build the prefix sum of $\mathbf{w}$, then find the first biome index $i$ where prefix$_i > r$ and $r = \text{hash2d}(x, y, \text{seed}+\text{":biome"}) \in [0,1)$.

---

## Tile Type Resolution

Tile type is determined first by biome, then by local noise variation, with feature generators such as rivers and mountains able to override the base result.

### Canonical Tile Type Distribution by Biome

| Biome     | Plains | Sand | Forest | Swamp | Rock | Mountain | Water | Oil | Ice |
|-----------|--------|------|--------|-------|------|----------|-------|-----|-----|
| Ocean     | 0.05   | 0.00 | 0.01   | 0.00  | 0.00 | 0.00     | 0.90  | 0.03 | 0.01 |
| Desert    | 0.10   | 0.70 | 0.01   | 0.00  | 0.10 | 0.05     | 0.01  | 0.03 | 0.00 |
| Jungle    | 0.10   | 0.00 | 0.60   | 0.15  | 0.01 | 0.01     | 0.10  | 0.02 | 0.01 |
| Forest    | 0.20   | 0.00 | 0.60   | 0.05  | 0.05 | 0.02     | 0.05  | 0.02 | 0.01 |
| Temperate | 0.40   | 0.05 | 0.30   | 0.05  | 0.10 | 0.05     | 0.03  | 0.01 | 0.01 |
| Tundra    | 0.10   | 0.00 | 0.05   | 0.00  | 0.10 | 0.05     | 0.05  | 0.00 | 0.65 |
| Mountain  | 0.05   | 0.00 | 0.01   | 0.00  | 0.30 | 0.60     | 0.01  | 0.01 | 0.02 |

Within each biome, the final tile type is selected by a deterministic weighted draw from the seed and tile coordinates.

Tile type is drawn by the same mechanism as biome: a prefix-sum walk against $r = \text{hash2d}(x, y, \text{seed}+\text{":tiletype"})$ over the biome's row in the table above. Feature generators fire before this draw and replace the result entirely when their threshold is met; a River override always produces Water, while a Mountain override produces Mountain or Rock depending on elevation strength.

---

## Feature Generation

### Rivers
River placement is driven by a smooth noise field sampled at medium scale. The contour line at value 0.5 of that field forms a continuous path across the map; any tile whose noise value falls within a narrow band around this line (the river band) is classified as Water, regardless of the biome draw. The river band width controls river width: narrower values produce winding channels, wider values produce broader river valleys. In cold regions ($T < T_{\text{ice}}$), river tiles are converted to Ice, preserving the river's path on the surface.

### Mountains
Mountain ranges emerge from a large-scale elevation noise field. Tiles where elevation exceeds a high threshold are assigned the Mountain biome, overriding the biome draw. Within Mountain biome, a second threshold separates peak tiles (Mountain type) from slope tiles (Rock type). Because elevation is a smooth noise field, mountain ranges form elongated ridges rather than isolated points, with rocky foothills surrounding the central peaks.

### Local Variation
After biome and base tile type are resolved, a high-frequency local variation pass introduces small-scale diversity: isolated rock outcrops in plains, occasional water pockets in forests, and forest patches in temperate grasslands. This final layer is the last override before resource rates are computed.

---

## Resource Generation

Resource generation is biome- and tile-dependent. Each tile is initialized with deterministic resource generation rates (see [Resource Generation](./resource-generation.md)).

---

## Noise Function and Coordinate Transforms

- All randomness is derived from the world seed and tile coordinates.
- Noise functions (e.g., Perlin, Simplex) are used for temperature, biome, and tile type variation.
- Coordinate transforms (e.g., banding, warping) are used to create natural-looking world features.

### Noise Parameters

A seedable Simplex or OpenSimplex noise function returning values in `[-1, 1]` fits the model well, expressed here as `Noise(seed, x, y, salt)`. That output is normalized to `[0,1]` with `u = (Noise(...) + 1) / 2`, and separate salts per resource such as `salt_iron` and `salt_carbon` help prevent strong cross-resource correlation.

Per-purpose frequencies keep large-scale and local patterns distinct. Example defaults:
- `freq_temp = 0.02` (large-scale temperature features)
- `freq_biome = 0.05`
- `freq_tile = 0.08`
- `freq_resource_iron = 0.08`
- `freq_resource_carbon = 0.12`
- `freq_capacity = 0.04`

---

## Chunk/Window Generation Strategy

- Tiles are generated in chunks/windows for efficiency.
- Chunk size is configurable (e.g. `16x16`, `32x32`).
- Neighboring chunks are prefetched for smooth exploration.

---

## Spawn Point Assignment

Player spawn points are not generated on demand — they are pre-selected before the game begins from the already-generated world and then partially overwritten to guarantee fairness.

### Spawn Biome Whitelist

A spawn candidate is only valid if its biome is on the **spawn whitelist**. Biomes are classified into three resource richness tiers based on the sum of their four per-resource biome multipliers (`Σm`). Only **Moderate** biomes are spawn-eligible; Rich biomes give spawning players a structural advantage, and Poor biomes give a structural disadvantage.

| Tier     | Σm range       | Rule           |
|----------|----------------|----------------|
| Rich     | > 4.25         | Not spawn eligible |
| Moderate | 3.75 – 4.25    | **Spawn eligible** |
| Poor     | < 3.75         | Not spawn eligible |

Current biome classifications:

| Biome     | Σ multipliers | Tier     | Spawn eligible |
|-----------|--------------|----------|----------------|
| Forest    | 3.95         | Moderate | ✓              |
| Temperate | 4.00         | Moderate | ✓              |
| Desert    | 3.95         | Moderate | ✓              |
| Jungle    | 3.75         | Moderate | ✓              |
| Tundra    | 3.60         | Poor     | ✗              |
| Mountain  | 3.45         | Poor     | ✗              |
| Ocean     | 2.60         | Poor     | ✗              |

> **Balance invariant:** If biome multipliers in [Resource Generation](./resource-generation.md) are tuned, the Σm values above must be rechecked. Any biome that crosses a tier boundary (e.g. Forest pushing past 4.25 into Rich) should have its spawn eligibility updated accordingly.

### Spawn Tile Override

When a player is assigned a spawn point, the exact tile at that coordinate has its **entire generated profile overwritten** with a standardised *Starter Tile* spec regardless of what the seed produced there:

- Fixed, balanced resource generation rates across all four resources.
- Depletion factors reset to `D_r = 1.0` for all resources; reserves set to full.
- Fixed capacity matching the Starter Tile spec.
- Tile type set to a neutral traversable type (Plains by default).

Every player receives an identical Starter Tile, so the spawn tile itself offers no inter-player advantage. The Starter Tile spec is a global game configuration value, not derived from the seed.

### Surrounding Tiles

Only the exact spawn coordinate is overwritten. All adjacent and further tiles remain as seed-generated. Spawn biome selection (whitelist above) is the mechanism that ensures surrounding terrain is broadly comparable in resource value across all player spawn regions — not per-tile normalisation.

### Placement Algorithm

1. Enumerate all tiles in the world whose biome is on the spawn whitelist and whose tile type is traversable (not Water, not Ice, not Oil tile).
2. For each candidate, compute the aggregate resource generation rate of tiles within a configurable `spawnEvalRadius` (default `5`).
3. From the filtered candidates, select spawn points such that no two players are within `minSpawnDistance` tiles of each other (default configurable; at minimum larger than `spawnEvalRadius`).
4. Among valid placement sets, prefer sets where the per-candidate aggregate resource scores are as equal as possible (minimise variance across candidates).
5. Overwrite the selected tiles with the Starter Tile profile.

---

## Edge Cases

- Feature generators (rivers, mountain ranges) may override the biome or tile type produced by the base noise. These overrides compose deterministically with the seed.

---

## Future / Planned Features
- **Procedural landmarks**: Unique, rare world features (e.g. craters, ancient ruins).
- **Moisture axis**: A second noise axis (humidity) alongside temperature could differentiate Desert from Jungle or Tundra from Forest at the same latitude, adding further strategic diversity to biome distribution.

---

## See Also
- [Map Structure](./map-structure.md)
- [Resource Generation](./resource-generation.md)

---

## Glossary

- **Noise(seed,x,y,salt)**: Seeded noise function returning `[-1,1]`; normalize with `(Noise+1)/2`.
- **freq_***: Frequency multiplier used when sampling noise for different systems (temp/biome/tile/resource/capacity).
- **hash2d(x, y, seedText)**: Deterministic float in `[0, 1)` derived from coordinate and seed string via FNV-1a-like hash. Used as the draw value in biome and tile type selection.
- **spawnEvalRadius**: Radius (in tiles) used when scoring spawn candidates for surrounding resource balance. Default `5`.
- **minSpawnDistance**: Minimum tile distance enforced between any two player spawn points.
- **Starter Tile**: A fixed, game-config-defined tile profile applied to the exact spawn coordinate for every player, overwriting all seed-generated stats.
- **elevation noise**: Large-scale noise field driving mountain range placement. Tiles above a high threshold override biome/tile type to Mountain or Rock.
- **river band**: Narrow contour around the 0.5 iso-line of the river noise field. Tiles within this band become Water (or Ice in cold regions).
- **band interpolation**: Linear blend of the two nearest latitude anchor rows in the biome weight table, parameterised by $t = (|y| - y_{\text{lo}}) / 20$.
- **T**: Normalized temperature in $[0, 1]$, highest at the equator, decreasing toward poles, warped by noise.
- **feature generator override**: A generator result (e.g. river or mountain feature) that explicitly overrides local biome/tileType selection. Feature overrides must compose deterministically with base noise.
