
# Resource Generation — Deterministic & Implementation-ready

This document replaces the original planned narrative with explicit, implementation-ready formulas, tables, and worked examples. Sections marked **FUTURE / PLANNED** are boxed and separated at the end.

---

## Summary (quick)
- **resourceRates**: Deterministic per-tick generation rates computed from `(seed,x,y)` and noise. Units: units/tick.
- **resourceAmounts**: Mutable stored amount on a tile (0..capacity), changed by extraction and regeneration. Units: units.
- Core formulas, noise function, capacities, and extraction formulas are defined below for direct implementation.

---
<div class="callout crossref" style="border:1px solid #cce5ff;background:#f0f8ff;padding:10px;border-radius:6px">
<strong>Canonical Cross-Reference (authoritative):</strong>
Use the "Comprehensive Cross-Reference Table (biome × tileType × resource)" in [Resource Generation](./resource-generation.md) as the single source of truth for base ranges, capacities, and `biomeMultiplier` values. Load or mirror that CSV at startup rather than duplicating values across docs or code.
</div>

## Noise and Mapping (explicit)

- Noise function: use a seedable Simplex or OpenSimplex implementation producing values in [-1, 1]. Call it `Noise(seed, x*freq, y*freq, salt)`.
- Normalize noise to [0,1]: u = (Noise(...) + 1) / 2.

Mapping method (per resource):

Given a tile type base range [Bmin, Bmax] and a per-resource noise sample u_r in [0,1]:

1) Base (pre-bonus) rate:

  rate_base = Bmin + u_r * (Bmax - Bmin)

2) Apply biome multiplier m (e.g., +10% => m = 1.10):

  rate_after_biome = rate_base * m

3) Apply global scaling factor S (default 1.0) and clamp to implementation limits:

  rate_final = clamp(rate_after_biome * S, Bmin, Bmax * (1 + maxBiomeBonus))

Where `clamp(x,a,b)` bounds `x` into `[a,b]` and `maxBiomeBonus` is the highest percent bonus expected (for safe upper bound).

Notes for implementers:
- Use separate noise salts per resource to avoid correlation: salt = resourceNameHash + noiseSeedOffset.
- Use distinct frequency `freq_resource` per resource to control patch size (e.g., iron freq=0.08, carbon freq=0.12).

### Worked example (explicit)
Tile: `(x,y)` of type `Rock`. Iron base range: [4, 7]. Biome: `Mountain` with +10% iron bonus.

- Sample noise: Noise(seed, x*0.08, y*0.08, salt_iron) = 0.3 (in [-1,1]).
- Normalize: u = (0.3 + 1) / 2 = 0.65.
- rate_base = 4 + 0.65 * (7 - 4) = 4 + 0.65 * 3 = 5.95 units/tick.
- Apply biome: rate_after_biome = 5.95 * 1.10 = 6.545 units/tick.
- With S=1.0 and clamp to [4, 7*1.10] => [4, 7.7], rate_final = 6.545 units/tick.

---

## Canonical Base Ranges (implementation table)
Base ranges are the per-tile-type, per-resource [Bmin, Bmax] used by the mapping formula above.

| Tile Type | Carbon [min,max] | Iron [min,max] | Crystal [min,max] | Oil [min,max] |
|-----------:|------------------:|---------------:|------------------:|--------------:|
| Plains     | [2,4]             | [1,3]          | [0,2]             | [1,3]         |
| Sand       | [0,1]             | [1,2]          | [2,4]             | [2,5]         |
| Forest     | [4,7]             | [0,2]          | [0,2]             | [1,3]         |
| Swamp      | [3,6]             | [0,1]          | [0,1]             | [2,4]         |
| Rock       | [0,1]             | [4,7]          | [0,2]             | [0,2]         |
| Mountain   | [0,1]             | [6,10]         | [2,4]             | [0,1]         |
| Water      | [0,0]             | [0,0]          | [0,1]             | [3,6]         |
| Oil        | [0,0]             | [1,2]          | [0,1]             | [7,10]        |
| Ice        | [0,1]             | [0,2]          | [3,6]             | [0,1]         |

Notes:
- A `[0,0]` range means the resource never generates (constant zero).
- Implementation should store these ranges in a config table keyed by `tileType`.

---

## Resource Maximum Capacities (explicit)

Capacity model options (choose one; recommended: hybrid):

1) Fixed per tile-type/resource: capacity = Cbase(tileType, resource).
2) Biome-adjusted: capacity = Cbase * biomeCapacityMultiplier.
3) Noise-derived variation: capacity = round(Cbase * (1 + capNoiseScale * u_c)) where u_c in [0,1] from a capacity noise sample and capNoiseScale in [0,1].

Canonical recommended implementation (hybrid):

  Cbase = table(tileType, resource)  // see canonical table below
  u_c = (Noise(seed, x*freq_cap, y*freq_cap, salt_capacity) + 1) / 2
  capacity = round(Cbase * (1 + capNoiseScale * u_c) * biomeCapMultiplier)

Default parameters (recommendation):
- capNoiseScale = 0.5 (capacity can vary +0..+50%)
- freq_cap = freq used for resource rates or slightly lower for larger capacity patches
- biomeCapMultiplier default 1.0, overridden by table for specific biome/tile combos

Canonical base capacity table (examples, units):

| Tile Type | Carbon Cbase | Iron Cbase | Crystal Cbase | Oil Cbase |
|-----------:|-------------:|-----------:|--------------:|----------:|
| Plains     | 2000         | 1500       | 500          | 1000     |
| Sand       | 500          | 1000       | 1500         | 2000     |
| Forest     | 4000         | 800        | 600          | 1200     |
| Swamp      | 2500         | 600        | 400          | 2000     |
| Rock       | 800          | 3000       | 800          | 600      |
| Mountain   | 600          | 5000       | 2000         | 500      |
| Water      | 0            | 0          | 300          | 3000     |
| Oil        | 0            | 800        | 400          | 12000    |
| Ice        | 200          | 800        | 2500         | 200      |

Worked example (capacity):
- Tile: Rock, Iron Cbase=3000, seed capacity noise u_c=0.4, capNoiseScale=0.5, biomeCapMultiplier=1.0
- capacity = round(3000 * (1 + 0.5 * 0.4) * 1.0) = round(3000 * 1.2) = 3600 units.

---

## Extraction Model — precise formulas

Terminology:
- P: extractor nominal power (units per tick).
- eff: extractor efficiency multiplier (0 < eff <= 1). Example: 0.75.
- d: adjacency distance in tiles (0 = same tile, 1 = adjacent). Use only exact adjacency; extraction beyond 1 is not allowed by default.
- adjacencyFactor: 1.0 when d=0; default 0.8 when d=1 (20% penalty). Implement as adjacencyFactor = max(0, 1 - 0.2 * d).
- A_t: available resource amount on tile at tick t.
- C: capacity of the resource on that tile.
- R: rate_final (units/tick) generated by tile (see mapping formula).
- maxExtractFrac: hard per-tick fraction of capacity allowed to be extracted (recommended default 0.10 = 10%).

Extraction request per tick (requested by extractor):

  requested = P * eff * adjacencyFactor

Actual extraction amount (per tick):

  extracted = min(requested, A_t, C * maxExtractFrac)

Update rule for resourceAmounts (discrete tick):

  A_{t+1} = clamp(A_t + R - extracted, 0, C)

Notes:
- If extracted < requested because of availability or cap, extractor collects only `extracted` units and game systems may record idle time or partial fill.
- For non-renewable resources (e.g., oil if configured non-renewable), set R=0 after depletion or set regen policy to a very small R.

Worked extraction example (explicit):
- Tile state at t: Rock tile, Iron: A_t = 1500 units, C = 2000 units, R = 6.545 units/tick (from earlier worked example).
- Extractor: P = 50 units/tick, eff = 0.5, adjacency d = 0 → adjacencyFactor = 1.0.
- requested = 50 * 0.5 * 1.0 = 25 units/tick.
- maxExtractFrac = 0.10 → C * maxExtractFrac = 200.
- extracted = min(25, 1500, 200) = 25 units.
- A_{t+1} = clamp(1500 + 6.545 - 25, 0, 2000) = 1481.545 units.

If extractor were adjacent (d=1), adjacencyFactor=0.8 → requested = 20; extracted = min(20, 1500, 200) = 20.

### Complex extraction worked example (adjacency, partial fill, depletion)

Context (shared): Rock tile, Iron `C = 2000` units capacity, regeneration `R = 6.545` units/tick (from earlier example). `maxExtractFrac = 0.10` → per-tick cap = 200 units.

Case A — Partial fill when extractor is same-tile and tile nearly empty
- Extractor: `P = 50`, `eff = 0.5`, `adjacencyFactor = 1.0` → `requested = 25` units/tick.
- Start `A0 = 30` units.
  - Tick 1: `extracted = min(25, 30, 200) = 25` → `A1 = 30 + 6.545 - 25 = 11.545`
  - Tick 2: `extracted = min(25, 11.545, 200) = 11.545` (partial fill) → `A2 = 11.545 + 6.545 - 11.545 = 6.545`
  - Tick 3+: `extracted = 6.545` → tile reaches steady-state at `A ≈ 6.545` (regen balances extraction).

Case B — Adjacent extractor penalty causing earlier partial fill
- Extractor: `P = 50`, `eff = 0.5`, `adjacencyFactor = 0.8` → `requested = 20` units/tick.
- Start `A0 = 15` units.
  - Tick 1: `extracted = min(20,15,200) = 15` → `A1 = 15 + 6.545 - 15 = 6.545`
  - Tick 2+: `extracted = 6.545` → steady-state at `A ≈ 6.545`.

Case C — High-power extractor and depletion flow (shows `maxExtractFrac` enforcement)
- Extractor: `P = 500`, `eff = 1.0`, same-tile → `requested = 500`. Per-tick cap = `C * maxExtractFrac = 200`.
- Start `A0 = 2000` (full).

Tick-by-tick (rounded to 3 decimals):
- Tick0: `A0 = 2000.000`
- Tick1: `extracted = 200` → `A1 = 2000 + 6.545 - 200 = 1806.545`
- Tick2: `extracted = 200` → `A2 = 1806.545 + 6.545 - 200 = 1613.090`
- Tick3: `A3 = 1419.635`
- Tick4: `A4 = 1226.180`
- Tick5: `A5 = 1032.725`
- Tick6: `A6 = 839.270`
- Tick7: `A7 = 645.815`
- Tick8: `A8 = 452.360`
- Tick9: `A9 = 258.905`
- Tick10: `extracted = 200` (still) → `A10 = 65.450`
- Tick11: `extracted = min(500, 65.450, 200) = 65.450` → `A11 = 6.545` (then steady-state at regen level)

Observations:
- `maxExtractFrac` bounds per-tick extraction and shapes the depletion curve; high-power extractors consume at up to `C*maxExtractFrac` until remaining `A_t` falls below that cap.
- Adjacent extractors pay a sustained penalty via `adjacencyFactor`, which increases chances of partial fill when `A_t` is small.
- When `extracted < requested` due to availability, the extractor experiences partial fill; when `extracted == requested` but `extracted > R`, the tile will steadily deplete until `A_t` drops low enough that `extracted` becomes limited by availability.

---

## Relationship: resourceRates vs resourceAmounts (glossary/table)

| Term | Stored field | Meaning | Update rule |
|------|--------------|---------|-------------|
| resourceRates | `tile.static.resourceRates` | Deterministic generation rates (units/tick). Calculated from `(seed,x,y)` via noise and mapping. | Used each tick to increase `resourceAmounts` up to `capacity`.
| resourceAmounts | `tile.dynamic.resourceAmounts` | Current available resource on tile (mutable). | Updated via A_{t+1} = clamp(A_t + R - extracted, 0, C).

Implementation notes:
- `resourceRates` is static/deterministic and can be recomputed on demand (no persistence required). `resourceAmounts` must be persisted and mutated.

---

## Cross-reference matrix — Biomes × Tile Types × Primary resources (implementation-ready)

This matrix maps a biome to its dominant tile types and the primary resources and base ranges you should allow when generating `resourceRates`. (Tables use the base ranges from the Canonical Base Ranges above; biome bonuses from the Map/Biome tables should be applied after mapping.)

| Biome \ Primary Tile Types | Primary tile types (dominant) | Primary resource types (highest base ranges) |
|---------------------------:|-------------------------------|---------------------------------------------|
| Ocean       | Water, Oil                      | Oil [3-6], Crystal [0-1]                     |
| Desert      | Sand, Plains                    | Oil [2-5], Crystal [2-4], Carbon [0-1]      |
| Jungle      | Forest, Swamp                   | Carbon [4-7], Oil [1-3]                     |
| Forest      | Forest, Plains                  | Carbon [4-7], Iron [1-3]                    |
| Temperate   | Plains, Forest                  | Carbon [2-4], Iron [1-3], Crystal [0-2]     |
| Tundra      | Ice, Plains                     | Crystal [3-6], Iron [0-2]                   |
| Mountain    | Mountain, Rock                  | Iron [6-10], Crystal [2-4]                  |

Use this matrix as a concise authoritative mapping for generator code. If a tile type appears in multiple biomes, use that tile type's canonical range and then apply the biome multiplier.

---

## Comprehensive Cross-Reference Table (biome × tileType × resource)

This single, implementation-ready CSV-style table provides direct lookup values for generator code. Columns:
- `biome`: biome name
- `tileType`: tile type
- `resource`: resource name
- `allowed`: whether the resource can appear on this tile (true if baseRange not [0,0] or Cbase>0)
- `baseRange`: canonical `[Bmin,Bmax]` for the tileType (from Canonical Base Ranges)
- `Cbase`: canonical base capacity for the tileType/resource (from Capacity table)
- `biomeMultiplier`: per-biome multiplier to apply to `rate_base` when computing `rate_final`

Implementation note: `rate_final = clamp(rate_base * biomeMultiplier * S, Bmin, Bmax * (1+maxBiomeBonus))` and `capacity = round(Cbase * (1 + capNoiseScale * u_c) * biomeCapMultiplier)`.

The table below is exhaustive for the canonical biomes and tile types used in the codebase. It repeats `baseRange` and `Cbase` per biome to make lookups simple and avoid joins at runtime.

biome,tileType,resource,allowed,baseRange,Cbase,biomeMultiplier
Ocean,Plains,carbon,true,[2,4],2000,0.5
Ocean,Plains,iron,true,[1,3],1500,0.5
Ocean,Plains,crystal,true,[0,2],500,0.5
Ocean,Plains,oil,true,[1,3],1000,1.10
Ocean,Sand,carbon,true,[0,1],500,0.5
Ocean,Sand,iron,true,[1,2],1000,0.5
Ocean,Sand,crystal,true,[2,4],1500,0.5
Ocean,Sand,oil,true,[2,5],2000,1.10
Ocean,Forest,carbon,true,[4,7],4000,0.5
Ocean,Forest,iron,true,[0,2],800,0.5
Ocean,Forest,crystal,true,[0,2],600,0.5
Ocean,Forest,oil,true,[1,3],1200,1.10
Ocean,Swamp,carbon,true,[3,6],2500,0.5
Ocean,Swamp,iron,true,[0,1],600,0.5
Ocean,Swamp,crystal,true,[0,1],400,0.5
Ocean,Swamp,oil,true,[2,4],2000,1.10
Ocean,Rock,carbon,true,[0,1],800,0.5
Ocean,Rock,iron,true,[4,7],3000,0.5
Ocean,Rock,crystal,true,[0,2],800,0.5
Ocean,Rock,oil,true,[0,2],600,1.10
Ocean,Mountain,carbon,true,[0,1],600,0.5
Ocean,Mountain,iron,true,[6,10],5000,0.5
Ocean,Mountain,crystal,true,[2,4],2000,0.5
Ocean,Mountain,oil,true,[0,1],500,1.10
Ocean,Water,carbon,false,[0,0],0,0.5
Ocean,Water,iron,false,[0,0],0,0.5
Ocean,Water,crystal,true,[0,1],300,0.5
Ocean,Water,oil,true,[3,6],3000,1.10
Ocean,Oil,carbon,false,[0,0],0,0.5
Ocean,Oil,iron,true,[1,2],800,0.5
Ocean,Oil,crystal,true,[0,1],400,0.5
Ocean,Oil,oil,true,[7,10],12000,1.10
Ocean,Ice,carbon,true,[0,1],200,0.5
Ocean,Ice,iron,true,[0,2],800,0.5
Ocean,Ice,crystal,true,[3,6],2500,0.5
Ocean,Ice,oil,true,[0,1],200,1.10
Desert,Plains,carbon,true,[2,4],2000,0.6
Desert,Plains,iron,true,[1,3],1500,0.8
Desert,Plains,crystal,true,[0,2],500,1.20
Desert,Plains,oil,true,[1,3],1000,1.25
Desert,Sand,carbon,true,[0,1],500,0.6
Desert,Sand,iron,true,[1,2],1000,0.8
Desert,Sand,crystal,true,[2,4],1500,1.20
Desert,Sand,oil,true,[2,5],2000,1.25
Desert,Forest,carbon,true,[4,7],4000,0.6
Desert,Forest,iron,true,[0,2],800,0.8
Desert,Forest,crystal,true,[0,2],600,1.20
Desert,Forest,oil,true,[1,3],1200,1.25
Desert,Swamp,carbon,true,[3,6],2500,0.6
Desert,Swamp,iron,true,[0,1],600,0.8
Desert,Swamp,crystal,true,[0,1],400,1.20
Desert,Swamp,oil,true,[2,4],2000,1.25
Desert,Rock,carbon,true,[0,1],800,0.6
Desert,Rock,iron,true,[4,7],3000,0.8
Desert,Rock,crystal,true,[0,2],800,1.20
Desert,Rock,oil,true,[0,2],600,1.25
Desert,Mountain,carbon,true,[0,1],600,0.6
Desert,Mountain,iron,true,[6,10],5000,0.8
Desert,Mountain,crystal,true,[2,4],2000,1.20
Desert,Mountain,oil,true,[0,1],500,1.25
Desert,Water,carbon,false,[0,0],0,0.6
Desert,Water,iron,false,[0,0],0,0.8
Desert,Water,crystal,true,[0,1],300,1.20
Desert,Water,oil,true,[3,6],3000,1.25
Desert,Oil,carbon,false,[0,0],0,0.6
Desert,Oil,iron,true,[1,2],800,0.8
Desert,Oil,crystal,true,[0,1],400,1.20
Desert,Oil,oil,true,[7,10],12000,1.25
Desert,Ice,carbon,true,[0,1],200,0.6
Desert,Ice,iron,true,[0,2],800,0.8
Desert,Ice,crystal,true,[3,6],2500,1.20
Desert,Ice,oil,true,[0,1],200,1.25
Jungle,Plains,carbon,true,[2,4],2000,1.25
Jungle,Plains,iron,true,[1,3],1500,0.7
Jungle,Plains,crystal,true,[0,2],500,0.8
Jungle,Plains,oil,true,[1,3],1000,1.05
Jungle,Sand,carbon,true,[0,1],500,1.25
Jungle,Sand,iron,true,[1,2],1000,0.7
Jungle,Sand,crystal,true,[2,4],1500,0.8
Jungle,Sand,oil,true,[2,5],2000,1.05
Jungle,Forest,carbon,true,[4,7],4000,1.25
Jungle,Forest,iron,true,[0,2],800,0.7
Jungle,Forest,crystal,true,[0,2],600,0.8
Jungle,Forest,oil,true,[1,3],1200,1.05
Jungle,Swamp,carbon,true,[3,6],2500,1.25
Jungle,Swamp,iron,true,[0,1],600,0.7
Jungle,Swamp,crystal,true,[0,1],400,0.8
Jungle,Swamp,oil,true,[2,4],2000,1.05
Jungle,Rock,carbon,true,[0,1],800,1.25
Jungle,Rock,iron,true,[4,7],3000,0.7
Jungle,Rock,crystal,true,[0,2],800,0.8
Jungle,Rock,oil,true,[0,2],600,1.05
Jungle,Mountain,carbon,true,[0,1],600,1.25
Jungle,Mountain,iron,true,[6,10],5000,0.7
Jungle,Mountain,crystal,true,[2,4],2000,0.8
Jungle,Mountain,oil,true,[0,1],500,1.05
Jungle,Water,carbon,false,[0,0],0,1.25
Jungle,Water,iron,false,[0,0],0,0.7
Jungle,Water,crystal,true,[0,1],300,0.8
Jungle,Water,oil,true,[3,6],3000,1.05
Jungle,Oil,carbon,false,[0,0],0,1.25
Jungle,Oil,iron,true,[1,2],800,0.7
Jungle,Oil,crystal,true,[0,1],400,0.8
Jungle,Oil,oil,true,[7,10],12000,1.05
Jungle,Ice,carbon,true,[0,1],200,1.25
Jungle,Ice,iron,true,[0,2],800,0.7
Jungle,Ice,crystal,true,[3,6],2500,0.8
Jungle,Ice,oil,true,[0,1],200,1.05
Forest,Plains,carbon,true,[2,4],2000,1.40
Forest,Plains,iron,true,[1,3],1500,1.05
Forest,Plains,crystal,true,[0,2],500,0.9
Forest,Plains,oil,true,[1,3],1000,0.9
Forest,Sand,carbon,true,[0,1],500,1.40
Forest,Sand,iron,true,[1,2],1000,1.05
Forest,Sand,crystal,true,[2,4],1500,0.9
Forest,Sand,oil,true,[2,5],2000,0.9
Forest,Forest,carbon,true,[4,7],4000,1.40
Forest,Forest,iron,true,[0,2],800,1.05
Forest,Forest,crystal,true,[0,2],600,0.9
Forest,Forest,oil,true,[1,3],1200,0.9
Forest,Swamp,carbon,true,[3,6],2500,1.40
Forest,Swamp,iron,true,[0,1],600,1.05
Forest,Swamp,crystal,true,[0,1],400,0.9
Forest,Swamp,oil,true,[2,4],2000,0.9
Forest,Rock,carbon,true,[0,1],800,1.40
Forest,Rock,iron,true,[4,7],3000,1.05
Forest,Rock,crystal,true,[0,2],800,0.9
Forest,Rock,oil,true,[0,2],600,0.9
Forest,Mountain,carbon,true,[0,1],600,1.40
Forest,Mountain,iron,true,[6,10],5000,1.05
Forest,Mountain,crystal,true,[2,4],2000,0.9
Forest,Mountain,oil,true,[0,1],500,0.9
Forest,Water,carbon,false,[0,0],0,1.40
Forest,Water,iron,false,[0,0],0,1.05
Forest,Water,crystal,true,[0,1],300,0.9
Forest,Water,oil,true,[3,6],3000,0.9
Forest,Oil,carbon,false,[0,0],0,1.40
Forest,Oil,iron,true,[1,2],800,1.05
Forest,Oil,crystal,true,[0,1],400,0.9
Forest,Oil,oil,true,[7,10],12000,0.9
Forest,Ice,carbon,true,[0,1],200,1.40
Forest,Ice,iron,true,[0,2],800,1.05
Forest,Ice,crystal,true,[3,6],2500,0.9
Forest,Ice,oil,true,[0,1],200,0.9
Temperate,Plains,carbon,true,[2,4],2000,1.00
Temperate,Plains,iron,true,[1,3],1500,1.00
Temperate,Plains,crystal,true,[0,2],500,1.00
Temperate,Plains,oil,true,[1,3],1000,1.00
Temperate,Sand,carbon,true,[0,1],500,1.00
Temperate,Sand,iron,true,[1,2],1000,1.00
Temperate,Sand,crystal,true,[2,4],1500,1.00
Temperate,Sand,oil,true,[2,5],2000,1.00
Temperate,Forest,carbon,true,[4,7],4000,1.00
Temperate,Forest,iron,true,[0,2],800,1.00
Temperate,Forest,crystal,true,[0,2],600,1.00
Temperate,Forest,oil,true,[1,3],1200,1.00
Temperate,Swamp,carbon,true,[3,6],2500,1.00
Temperate,Swamp,iron,true,[0,1],600,1.00
Temperate,Swamp,crystal,true,[0,1],400,1.00
Temperate,Swamp,oil,true,[2,4],2000,1.00
Temperate,Rock,carbon,true,[0,1],800,1.00
Temperate,Rock,iron,true,[4,7],3000,1.00
Temperate,Rock,crystal,true,[0,2],800,1.00
Temperate,Rock,oil,true,[0,2],600,1.00
Temperate,Mountain,carbon,true,[0,1],600,1.00
Temperate,Mountain,iron,true,[6,10],5000,1.00
Temperate,Mountain,crystal,true,[2,4],2000,1.00
Temperate,Mountain,oil,true,[0,1],500,1.00
Temperate,Water,carbon,false,[0,0],0,1.00
Temperate,Water,iron,false,[0,0],0,1.00
Temperate,Water,crystal,true,[0,1],300,1.00
Temperate,Water,oil,true,[3,6],3000,1.00
Temperate,Oil,carbon,false,[0,0],0,1.00
Temperate,Oil,iron,true,[1,2],800,1.00
Temperate,Oil,crystal,true,[0,1],400,1.00
Temperate,Oil,oil,true,[7,10],12000,1.00
Temperate,Ice,carbon,true,[0,1],200,1.00
Temperate,Ice,iron,true,[0,2],800,1.00
Temperate,Ice,crystal,true,[3,6],2500,1.00
Temperate,Ice,oil,true,[0,1],200,1.00
Tundra,Plains,carbon,true,[2,4],2000,0.5
Tundra,Plains,iron,true,[1,3],1500,0.9
Tundra,Plains,crystal,true,[0,2],500,1.40
Tundra,Plains,oil,true,[1,3],1000,0.8
Tundra,Sand,carbon,true,[0,1],500,0.5
Tundra,Sand,iron,true,[1,2],1000,0.9
Tundra,Sand,crystal,true,[2,4],1500,1.40
Tundra,Sand,oil,true,[2,5],2000,0.8
Tundra,Forest,carbon,true,[4,7],4000,0.5
Tundra,Forest,iron,true,[0,2],800,0.9
Tundra,Forest,crystal,true,[0,2],600,1.40
Tundra,Forest,oil,true,[1,3],1200,0.8
Tundra,Swamp,carbon,true,[3,6],2500,0.5
Tundra,Swamp,iron,true,[0,1],600,0.9
Tundra,Swamp,crystal,true,[0,1],400,1.40
Tundra,Swamp,oil,true,[2,4],2000,0.8
Tundra,Rock,carbon,true,[0,1],800,0.5
Tundra,Rock,iron,true,[4,7],3000,0.9
Tundra,Rock,crystal,true,[0,2],800,1.40
Tundra,Rock,oil,true,[0,2],600,0.8
Tundra,Mountain,carbon,true,[0,1],600,0.5
Tundra,Mountain,iron,true,[6,10],5000,0.9
Tundra,Mountain,crystal,true,[2,4],2000,1.40
Tundra,Mountain,oil,true,[0,1],500,0.8
Tundra,Water,carbon,false,[0,0],0,0.5
Tundra,Water,iron,false,[0,0],0,0.9
Tundra,Water,crystal,true,[0,1],300,1.40
Tundra,Water,oil,true,[3,6],3000,0.8
Tundra,Oil,carbon,false,[0,0],0,0.5
Tundra,Oil,iron,true,[1,2],800,0.9
Tundra,Oil,crystal,true,[0,1],400,1.40
Tundra,Oil,oil,true,[7,10],12000,0.8
Tundra,Ice,carbon,true,[0,1],200,0.5
Tundra,Ice,iron,true,[0,2],800,0.9
Tundra,Ice,crystal,true,[3,6],2500,1.40
Tundra,Ice,oil,true,[0,1],200,0.8
Mountain,Plains,carbon,true,[2,4],2000,0.4
Mountain,Plains,iron,true,[1,3],1500,1.35
Mountain,Plains,crystal,true,[0,2],500,1.10
Mountain,Plains,oil,true,[1,3],1000,0.6
Mountain,Sand,carbon,true,[0,1],500,0.4
Mountain,Sand,iron,true,[1,2],1000,1.35
Mountain,Sand,crystal,true,[2,4],1500,1.10
Mountain,Sand,oil,true,[2,5],2000,0.6
Mountain,Forest,carbon,true,[4,7],4000,0.4
Mountain,Forest,iron,true,[0,2],800,1.35
Mountain,Forest,crystal,true,[0,2],600,1.10
Mountain,Forest,oil,true,[1,3],1200,0.6
Mountain,Swamp,carbon,true,[3,6],2500,0.4
Mountain,Swamp,iron,true,[0,1],600,1.35
Mountain,Swamp,crystal,true,[0,1],400,1.10
Mountain,Swamp,oil,true,[2,4],2000,0.6
Mountain,Rock,carbon,true,[0,1],800,0.4
Mountain,Rock,iron,true,[4,7],3000,1.35
Mountain,Rock,crystal,true,[0,2],800,1.10
Mountain,Rock,oil,true,[0,2],600,0.6
Mountain,Mountain,carbon,true,[0,1],600,0.4
Mountain,Mountain,iron,true,[6,10],5000,1.35
Mountain,Mountain,crystal,true,[2,4],2000,1.10
Mountain,Mountain,oil,true,[0,1],500,0.6
Mountain,Water,carbon,false,[0,0],0,0.4
Mountain,Water,iron,false,[0,0],0,1.35
Mountain,Water,crystal,true,[0,1],300,1.10
Mountain,Water,oil,true,[3,6],3000,0.6
Mountain,Oil,carbon,false,[0,0],0,0.4
Mountain,Oil,iron,true,[1,2],800,1.35
Mountain,Oil,crystal,true,[0,1],400,1.10
Mountain,Oil,oil,true,[7,10],12000,0.6
Mountain,Ice,carbon,true,[0,1],200,0.4
Mountain,Ice,iron,true,[0,2],800,1.35
Mountain,Ice,crystal,true,[3,6],2500,1.10
Mountain,Ice,oil,true,[0,1],200,0.6

---

Implementation note: Place this CSV block into a machine-loadable file or hardcode into `mapRules` config loaded at startup. The `biomeMultiplier` column should be applied when computing `rate_final` for a tile whose biome matches `biome`.




## Implementation checklist (for a future agent)

- Implement seedable Simplex noise accessor `Noise(seed,x,y,salt)` returning [-1,1].
- Add config tables: `baseRanges[tileType][resource]`, `capacityBase[tileType][resource]`, `biomeMultipliers[biome][resource]`.
- Implement `computeResourceRate(seed,x,y,tileType,resource)` using the mapping method above.
- Implement `computeCapacity(seed,x,y,tileType,resource)` using hybrid capacity formula above.
- Implement extraction tick update calling `extracted = min(requested, A_t, C*maxExtractFrac)` and then `A_{t+1} = clamp(A_t + R - extracted,0,C)`.

---

See also: [Map Structure](./map-structure.md) and [Map Generation](./map-generation.md)

---

## Glossary — key terms (implementation-ready)

- **resourceRates**: Deterministic per-tile, per-resource generation rate (units/tick). Computed from `(seed,x,y)` using the noise → mapping formula. Stored as `tile.static.resourceRates`.
- **resourceAmounts**: Mutable stored amount for a given resource on a tile (units). Stored as `tile.dynamic.resourceAmounts`. Range: `0..capacity`.
- **capacity (C)**: Maximum storable units of a resource on a tile. Computed via `Cbase`, noise, and biome multipliers. See Capacity model and formula: `capacity = round(Cbase * (1 + capNoiseScale * u_c) * biomeCapMultiplier)`.
- **extraction**: The act of removing `extracted` units from `resourceAmounts` per tick by an extractor. Formula: `extracted = min(requested, A_t, C * maxExtractFrac)` where `requested = P * eff * adjacencyFactor`.
- **biome**: Large-scale environmental classification (e.g., `Forest`, `Desert`) that influences `resourceRates` via `biomeMultiplier` and capacity via `biomeCapMultiplier`.
- **tileType**: Local terrain/material classification (e.g., `Plains`, `Rock`) determining `baseRanges` and `Cbase` used by generators.
- **rate_base**: Intermediate computed base rate before biome/global multipliers: `Bmin + u_r * (Bmax - Bmin)`.
- **rate_final (R)**: Final deterministic per-tick generation rate after multipliers and clamping: `rate_final = clamp(rate_base * biomeMultiplier * S, Bmin, Bmax*(1+maxBiomeBonus))`.
- **Cbase**: Canonical base capacity value per `tileType` and `resource` from the `capacityBase` table.
- **capNoiseScale**: Tunable scale (0..1) that controls how much capacity varies with noise (default 0.5 recommended).
- **u_r / u_c**: Normalized noise samples in [0,1] used for rate (`u_r`) and capacity (`u_c`) calculations: `u = (Noise(...) + 1)/2`.
- **P**: Extractor nominal power (units/tick).
- **eff**: Extractor efficiency multiplier (0 < eff <= 1).
- **adjacencyFactor**: Penalty multiplier for extraction when extractor is not on the same tile. Default: `1.0` for d=0, `0.8` for d=1. Formula: `adjacencyFactor = max(0, 1 - 0.2 * d)`.
- **maxExtractFrac**: Hard per-tick fraction of tile capacity allowed to be extracted (recommended default 0.10 = 10%).

---

<div class="callout future" style="border:1px solid #f0c040;background:#fff9e6;padding:12px;border-radius:6px">
<strong>FUTURE / PLANNED</strong>
<ul>
  <li>Multi-resource extraction buildings (simultaneous extraction with configurable ratios).</li>
  <li>Regional diffusion and resource migration between adjacent tiles (seepage model).</li>
  <li>Temporary global/regional resource modifiers (events) that alter <code>rate_final</code> for a duration.</li>
  <li>Time-varying biome shifts that change <code>biomeMultiplier</code> over long timescales.</li>
</ul>
</div>

