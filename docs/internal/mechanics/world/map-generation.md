
# Map Generation (Planned Model)

This document specifies the **planned deterministic map and biome generation model**, including the biome weight model, noise function, tile generation algorithm, and explicit mapping rules. All advanced features are marked as **Planned** or **Future** where not yet implemented.


<div class="callout crossref" style="border:1px solid #cce5ff;background:#f0f8ff;padding:10px;border-radius:6px">
<strong>Canonical Cross-Reference (authoritative):</strong>
Use the "Comprehensive Cross-Reference Table (biome × tileType × resource)" in [Resource Generation](./resource-generation.md) as the single source of truth for base ranges, capacities, and `biomeMultiplier` values. Load or mirror that CSV at startup rather than duplicating values across docs or code.
</div>
## Core Principle

The world is generated using a **deterministic, seed-based system**:
- A single seed defines the entire world.
- Generation is pure and reproducible.
- The same `(seed, x, y)` always produces the same result.

---

## Generation Model

### On-Demand World Generation
- The world is generated procedurally as needed (on exploration, scan, or system request).
- Infinite world size is supported by lazy, chunk-based expansion.
- No randomness is used except as derived from the world seed.

### Determinism Invariant
- No side effects during generation.
- Persistence only after generation.

---

## Temperature Model

Temperature is the primary driver of biome distribution.

### Base Gradient
- Temperature is highest at `y = 0` (equator).
- Temperature decreases as $|y|$ increases (toward poles).
- Formula (Planned):
  $$
  ## FUTURE / PLANNED

  <div class="callout future" style="border:1px solid #f0c040;background:#fff9e6;padding:12px;border-radius:6px">
  <strong>FUTURE / PLANNED</strong>
  $$
  Where $T_{eq}$ is equatorial temp, $k$ is a gradient constant, $N_{temp}$ is seed-based noise.

### Noise Variation
- Seed-based noise is added to temperature to create irregular biome boundaries.
  </div>
- Prevents straight lines and creates natural transitions.

---

## Biome Generation

Biomes are determined by:
- Temperature (primary)
- Seed-based noise (secondary)
- Feature generators (e.g., rivers, mountains)

### Canonical Biome Set
| Biome     | Description                        |
|-----------|------------------------------------|
| Ocean     | Deep water, islands                |
| Desert    | Hot, arid, sandy                   |
| Jungle    | Dense, humid, lush                 |
| Forest    | Temperate, wooded                  |
| Temperate | Mixed grassland/forest             |
| Tundra    | Cold, sparse, icy                  |
| Mountain  | High elevation, rocky, cold        |

### Biome Weight Model (Planned)

Each latitude band (y) has a **biome weight vector** specifying the probability of each biome, modulated by noise and features.

| Latitude Band (y) | Ocean | Desert | Jungle | Forest | Temperate | Tundra | Mountain |
|-------------------|-------|--------|--------|--------|-----------|--------|----------|
| Equator (0)       | 0.10  | 0.30   | 0.25   | 0.10   | 0.10      | 0.00   | 0.15     |
| Mid (±20)         | 0.10  | 0.20   | 0.15   | 0.20   | 0.20      | 0.05   | 0.10     |
| High (±40)        | 0.15  | 0.05   | 0.05   | 0.20   | 0.25      | 0.20   | 0.10     |
| Polar (±60+)      | 0.20  | 0.00   | 0.00   | 0.10   | 0.10      | 0.50   | 0.10     |

**Notes:**
- Actual biome is selected by weighted random (deterministic via seed+coords) within the band, with local noise.
- Feature generators (e.g., rivers, mountains) can override the base biome.

---

## Tile Type Resolution

Tile type is determined by:
1. Biome (primary)
2. Local noise variation (secondary)
3. Feature generators (e.g., rivers, mountains)

### Canonical Tile Type Distribution by Biome (Planned)

| Biome     | Plains | Sand | Forest | Swamp | Rock | Mountain | Water | Oil | Ice |
|-----------|--------|------|--------|-------|------|----------|-------|-----|-----|
| Ocean     | 0.05   | 0.00 | 0.01   | 0.00  | 0.00 | 0.00     | 0.90  | 0.03| 0.01|
| Desert    | 0.10   | 0.70 | 0.01   | 0.00  | 0.10 | 0.05     | 0.01  | 0.03| 0.00|
| Jungle    | 0.10   | 0.00 | 0.60   | 0.15  | 0.01 | 0.01     | 0.10  | 0.02| 0.01|
| Forest    | 0.20   | 0.00 | 0.60   | 0.05  | 0.05 | 0.02     | 0.05  | 0.02| 0.01|
| Temperate | 0.40   | 0.05 | 0.30   | 0.05  | 0.10 | 0.05     | 0.03  | 0.01| 0.01|
| Tundra    | 0.10   | 0.00 | 0.05   | 0.00  | 0.10 | 0.05     | 0.05  | 0.00| 0.65|
| Mountain  | 0.05   | 0.00 | 0.01   | 0.00  | 0.30 | 0.60     | 0.01  | 0.01| 0.02|

**Notes:**
- Probabilities sum to 1.0 per biome.
- Actual tile type is selected by deterministic weighted random (seed+coords).

---

## Feature Generation

### Rivers (Planned)
- Generated using noise bands or flow algorithms.
- Form long, connected `water` paths, crossing multiple biomes.
- Become `ice` rivers in Tundra/Ice biomes at low temperature.

### Mountains (Planned)
- Large-scale mountain ranges generated by banded noise and feature overlays.

### Local Variation
- Small-scale noise adds micro-features and diversity.

---

## Resource Generation

Resource generation is biome- and tile-dependent. Each tile is initialized with deterministic resource generation rates (see [Resource Generation](./resource-generation.md)).

> **Canonical Cross-Reference (authoritative):** Refer to the "Comprehensive Cross-Reference Table (biome × tileType × resource)" in [Resource Generation](./resource-generation.md) for the single source of truth (base ranges, capacities, biomeMultipliers). Implementers should load or mirror that CSV/table at startup rather than duplicating values here.

---

## Noise Function and Coordinate Transforms (Planned)

- All randomness is derived from the world seed and tile coordinates.
- Noise functions (e.g., Perlin, Simplex) are used for temperature, biome, and tile type variation.
- Coordinate transforms (e.g., banding, warping) are used to create natural-looking world features.

### Implementation-ready noise guidance

- **Noise function**: Use a seedable Simplex or OpenSimplex noise implementation that returns values in [-1, 1]. Name it `Noise(seed, x, y, salt)`.
- **Normalization**: convert to [0,1] via u = (Noise(...) + 1) / 2.
- **Resource noise salts**: use separate salts per resource (e.g., `salt_iron`, `salt_carbon`) to avoid strong cross-resource correlation.
- **Frequencies**: store per-purpose frequencies (example defaults):
  - `freq_temp = 0.02` (large-scale temperature features)
  - `freq_biome = 0.05`
  - `freq_tile = 0.08`
  - `freq_resource_iron = 0.08`
  - `freq_resource_carbon = 0.12`
  - `freq_capacity = 0.04`

### Mapping noise → resource rates (summary)

Implementers should call the mapping formula described in [Resource Generation](./resource-generation.md):

1. Sample resource noise: u_r = (Noise(seed, x*freq_resource, y*freq_resource, salt_resource) + 1)/2
2. rate_base = Bmin + u_r * (Bmax - Bmin)
3. rate_final = clamp(rate_base * biomeMultiplier * S, Bmin, Bmax*(1+maxBiomeBonus))

Use the canonical `baseRanges` table in [Resource Generation](./resource-generation.md).

---

## Capacity & Regeneration (explicit formulas)

Implementers should compute tile capacities and apply regeneration each tick using the following explicit formulas.

Capacity (per tile, per resource):

```
Cbase = capacityBase[tileType][resource]
u_c = (Noise(seed, x*freq_capacity, y*freq_capacity, salt_capacity) + 1) / 2
capacity = round(Cbase * (1 + capNoiseScale * u_c) * biomeCapMultiplier)
```

Recommended defaults: `capNoiseScale = 0.5`, `freq_capacity = 0.04`.

Regeneration per tick (apply to `resourceAmounts`):

```
R = computeResourceRate(seed,x,y,tileType,resource)  // rate_final from mapping
A_{t+1} = clamp(A_t + R, 0, capacity)
```

When extraction occurs in the same tick the combined update becomes:

```
extracted = min(requested, A_t, capacity * maxExtractFrac)
A_{t+1} = clamp(A_t + R - extracted, 0, capacity)
```

Worked example (capacity + regen):
- Tile: Rock, Iron Cbase = 3000
- Seed capacity noise sample: Noise(...) = -0.2 => u_c = 0.4
- capNoiseScale = 0.5, biomeCapMultiplier = 1.0
- capacity = round(3000 * (1 + 0.5 * 0.4) * 1.0) = round(3000 * 1.2) = 3600
- From Resource Generation: R = 6.545 units/tick
- Current amount A_t = 1500, extractor requests 25 units as in example
- extracted = min(25, 1500, 3600*0.10=360) = 25
- A_{t+1} = clamp(1500 + 6.545 - 25, 0, 3600) = 1481.545

Store `capacity` in the tile's persisted metadata only if needed for performance; it can be recomputed deterministically on demand.

---

## Glossary — key terms (implementation-ready)

- **Noise(seed,x,y,salt)**: Seeded noise function returning [-1,1]; normalize with `(Noise+1)/2`.
- **freq_***: Frequency multiplier used when sampling noise for different systems (temp/biome/tile/resource/capacity).
- **biomeMultiplier**: Per-biome, per-resource multiplier applied to `rate_base` to produce `rate_final`.
- **biomeCapMultiplier**: Per-biome multiplier applied to capacity calculation.
- **capacityBase (Cbase)**: Base capacity table used in computing `capacity`.
- **Regeneration (R)**: Same as `rate_final`; amount added to `resourceAmounts` each tick (before extraction application in the same tick).

Additional glossary entries (expanded for FUTURE items):

- **temporal biome migration**: A FUTURE mechanic where biome boundaries shift over long time scales, changing `biomeMultiplier` and tile distributions. Must be implemented with migration and persistence tooling to avoid breaking determinism for existing players.
- **regional state influence**: FUTURE feature where regional/global states (weather, events) modify `R` or `biomeMultiplier` for multiple tiles for a bounded time window. These modifiers must be applied via explicit contracts to preserve auditability.
- **feature generator override**: A generator result (e.g., river or mountain feature) that explicitly overrides local biome/tileType selection. Feature overrides must compose deterministically with base noise.


## FUTURE / PLANNED (boxed)

The features below are intentionally marked FUTURE/PLANNED and are boxed here for visibility and contractual clarity. Do not rely on these unless they are explicitly implemented and documented.

- Temporal biome migration (biome boundaries shift over long time spans).
- Regeneration influenced by regional state (e.g., global events reduce `R` temporarily).
- Non-deterministic, player-driven world changes that break strict seed determinism (must be gated behind migration/migration-tools).

Additional guidance (definitions for FUTURE items):

- **temporal biome migration**: FUTURE mechanic where biome boundaries shift over long timescales, altering `biomeMultiplier` and tile distributions. Requires migration tooling to update persisted `resourceAmounts` safely.
- **regional state influence**: FUTURE feature where regional/global states (weather, events) alter `R` or `biomeMultiplier` for bounded durations. Such modifiers must be contractually auditable and reversible.
- **non-deterministic player-driven changes**: FUTURE actions that would break strict seed determinism; must be gated and accompanied by migration and persistence strategies.


### Worked mapping example (connector)

This is the same worked example referenced in [Resource Generation] but shown here in the generation flow:

- Determine tileType from biome + tile noise.
- Lookup Bmin/Bmax for the tileType+resource.
- Sample resource noise with salt and frequency.
- Compute `rate_final` and attach to the tile's `resourceRates` static object.

---


---

## Chunk/Window Generation Strategy (Planned)

- Tiles are generated in chunks/windows for efficiency.
- Chunk size is configurable (e.g., 16x16, 32x32).
- Neighboring chunks are prefetched for smooth exploration.

---

## Regeneration Safety and Migration Concerns (Planned)

- Regeneration must preserve determinism and player data.
- Migration tools may be needed for map upgrades or seed changes.

---

## Edge Cases and Special Rules

- Tiles at biome boundaries use the dominant biome for bonuses and type selection.
- Feature generators can override base biome/tile type.
- If a tile's type is not buildable, extraction may occur from adjacent tiles (see [Resource Generation](./resource-generation.md)).

---

## Future/Planned Features

- **Dynamic world events**: Temporary biome or resource changes (e.g., volcanic eruption, flood).
- **Biome migration**: Slow shifting of biome boundaries over time.
- **Procedural landmarks**: Unique, rare world features (e.g., craters, ancient ruins).

---

## See Also
- [Map Structure](./map-structure.md)
- [Resource Generation](./resource-generation.md)
