
# Resource Generation — Deterministic & Implementation-ready

This document provides explicit, implementation-ready formulas, tables, and worked examples for resource generation. Sections that are not fully implemented are under development and may change as the system evolves. Only genuinely speculative or idea features are marked as **FUTURE**.

---

## Summary (quick)
- **resourceRates**: Deterministic per-tick generation rates computed from `(seed,x,y)` and noise. Units: units/tick.
- **resourceAmounts**: Mutable stored amount on a tile `(0..capacity)`, changed by extraction and regeneration. Units: units.
- Core formulas, noise function, capacities, and extraction formulas are defined below for direct implementation.

---

## Noise and Mapping (explicit)

- Noise function: use a seedable Simplex or OpenSimplex implementation producing values in `[-1, 1]`. Call it `Noise(seed, x*freq, y*freq, salt)`.
- Normalize noise to `[0,1]`: `u = (Noise(...) + 1) / 2`.

Mapping method (per resource):

Given a tile type base range `[Bmin, Bmax]` and a per-resource noise sample `u_r` in `[0,1]`:

1. Base (pre-bonus) rate:

   `rate_base = Bmin + u_r * (Bmax - Bmin)`

2. Apply biome multiplier `m` (e.g. `+10% => m = 1.10`):

   `rate_after_biome = rate_base * m`

3. Apply global scaling factor `S` (default `1.0`) and clamp to implementation limits:

   `rate_final = clamp(rate_after_biome * S, Bmin, Bmax * (1 + maxBiomeBonus))`

Where `clamp(x,a,b)` bounds `x` into `[a,b]` and `maxBiomeBonus` is the highest percent bonus expected (for safe upper bound).

Notes for implementers:
- Use separate noise salts per resource to avoid correlation: `salt = resourceNameHash + noiseSeedOffset`.
- Use distinct frequency `freq_resource` per resource to control patch size (e.g. iron `freq=0.08`, carbon `freq=0.12`).

### Worked example (explicit)

Tile: `(x,y)` of type `Rock`. Iron base range: `[4, 7]`. Biome: `Mountain` with `+10%` iron bonus.

- Sample noise: `Noise(seed, x*0.08, y*0.08, salt_iron) = 0.3` (in `[-1,1]`).
- Normalize: `u = (0.3 + 1) / 2 = 0.65`.
- `rate_base = 4 + 0.65 * (7 - 4) = 4 + 0.65 * 3 = 5.95` units/tick.
- Apply biome: `rate_after_biome = 5.95 * 1.10 = 6.545` units/tick.
- With `S=1.0` and clamp to `[4, 7*1.10] => [4, 7.7]`, `rate_final = 6.545` units/tick.

---

## Canonical Base Ranges (implementation table)

Base ranges are the per-tile-type, per-resource `[Bmin, Bmax]` used by the mapping formula above.

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

1. Fixed per tile-type/resource:

   $$
   \text{capacity} = C_{\text{base}}(\text{tileType}, \text{resource})
   $$

2. Biome-adjusted:

   $$
   \text{capacity} = C_{\text{base}} \cdot \text{biomeCapMultiplier}
   $$

3. Noise-derived variation:

   $$
   \text{capacity} = \mathrm{round}\left(C_{\text{base}} \cdot (1 + \text{capNoiseScale} \cdot u_c)\right)
   $$

   where $u_c \in [0,1]$ from a capacity noise sample and $\text{capNoiseScale} \in [0,1]$.

Canonical recommended implementation (hybrid):

$$
\begin{align*}
C_{\text{base}} &= \text{table}(\text{tileType}, \text{resource}) \\
u_c &= \frac{\text{Noise}(\text{seed}, x \cdot \text{freq}_{\text{cap}}, y \cdot \text{freq}_{\text{cap}}, \text{salt}_{\text{capacity}}) + 1}{2} \\
\text{capacity} &= \mathrm{round}\left(C_{\text{base}} \cdot (1 + \text{capNoiseScale} \cdot u_c) \cdot \text{biomeCapMultiplier}\right)
\end{align*}
$$

Default parameters (recommendation):
- $\text{capNoiseScale} = 0.5$ (capacity can vary $+0..+50\%$)
- $\text{freq}_{\text{cap}}$ = frequency used for resource rates or slightly lower for larger capacity patches
- $\text{biomeCapMultiplier}$ default $1.0$, overridden by table for specific biome/tile combos

Canonical base capacity table (examples, units):

| Tile Type | Carbon Cbase | Iron Cbase | Crystal Cbase | Oil Cbase |
|-----------:|-------------:|-----------:|--------------:|----------:|
| Plains     | 2000         | 1500       | 500           | 1000      |
| Sand       | 500          | 1000       | 1500          | 2000      |
| Forest     | 4000         | 800        | 600           | 1200      |
| Swamp      | 2500         | 600        | 400           | 2000      |
| Rock       | 800          | 3000       | 800           | 600       |
| Mountain   | 600          | 5000       | 2000          | 500       |
| Water      | 0            | 0          | 300           | 3000      |
| Oil        | 0            | 800        | 400           | 12000     |
| Ice        | 200          | 800        | 2500          | 200       |

Worked example (capacity):
- Tile: Rock, Iron `Cbase=3000`, seed capacity noise `u_c=0.4`, `capNoiseScale=0.5`, `biomeCapMultiplier=1.0`
- `capacity = round(3000 * (1 + 0.5 * 0.4) * 1.0) = round(3000 * 1.2) = 3600` units.

---

## Extraction Model — precise formulas

Terminology:
- `P`: extractor nominal power (units per tick).
- `eff`: extractor efficiency multiplier (`0 < eff <= 1`). Example: `0.75`.
- `d`: adjacency distance in tiles (`0 = same tile`, `1 = adjacent`). Use only exact adjacency; extraction beyond `1` is not allowed by default.
- `adjacencyFactor`: `1.0` when `d=0`; default `0.8` when `d=1` (20% penalty). Implement as `adjacencyFactor = max(0, 1 - 0.2 * d)`.
- `A_t`: available resource amount on tile at tick `t`.
- `C`: capacity of the resource on that tile.
- `R`: `rate_final` (units/tick) generated by tile (see mapping formula).
- `maxExtractFrac`: hard per-tick fraction of capacity allowed to be extracted (recommended default `0.10 = 10%`).

Extraction request per tick (requested by extractor):

$$
\text{requested} = P \cdot \text{eff} \cdot \text{adjacencyFactor}
$$

Actual extraction amount (per tick):

$$
\text{extracted} = \min(\text{requested},\ A_t,\ C \cdot \text{maxExtractFrac})
$$

Update rule for $\text{resourceAmounts}$ (discrete tick):

$$
A_{t+1} = \mathrm{clamp}(A_t + R - \text{extracted},\ 0,\ C)
$$

Notes:
- If `extracted < requested` because of availability or cap, extractor collects only `extracted` units and game systems may record idle time or partial fill.
- For non-renewable resources (e.g. oil if configured non-renewable), set `R=0` after depletion or set regen policy to a very small `R`.

Worked extraction example (explicit):
- Tile state at `t`: Rock tile, Iron: `A_t = 1500` units, `C = 2000` units, `R = 6.545` units/tick (from earlier worked example).
- Extractor: `P = 50` units/tick, `eff = 0.5`, adjacency `d = 0` -> `adjacencyFactor = 1.0`.
- `requested = 50 * 0.5 * 1.0 = 25` units/tick.
- `maxExtractFrac = 0.10` -> `C * maxExtractFrac = 200`.
- `extracted = min(25, 1500, 200) = 25` units.
- `A_{t+1} = clamp(1500 + 6.545 - 25, 0, 2000) = 1481.545` units.

If extractor were adjacent (`d=1`), `adjacencyFactor=0.8` -> `requested = 20`; `extracted = min(20, 1500, 200) = 20`.

### Complex extraction worked example (adjacency, partial fill, depletion)

Context (shared): Rock tile, Iron `C = 2000` units capacity, regeneration `R = 6.545` units/tick (from earlier example). `maxExtractFrac = 0.10` -> per-tick cap = `200` units.

Case A — Partial fill when extractor is same-tile and tile nearly empty
- Extractor: `P = 50`, `eff = 0.5`, `adjacencyFactor = 1.0` -> `requested = 25` units/tick.
- Start `A0 = 30` units.
  - Tick 1: `extracted = min(25, 30, 200) = 25` -> `A1 = 30 + 6.545 - 25 = 11.545`
  - Tick 2: `extracted = min(25, 11.545, 200) = 11.545` (partial fill) -> `A2 = 11.545 + 6.545 - 11.545 = 6.545`
  - Tick 3+: `extracted = 6.545` -> tile reaches steady-state at `A ≈ 6.545` (regen balances extraction).

Case B — Adjacent extractor penalty causing earlier partial fill
- Extractor: `P = 50`, `eff = 0.5`, `adjacencyFactor = 0.8` -> `requested = 20` units/tick.
- Start `A0 = 15` units.
  - Tick 1: `extracted = min(20,15,200) = 15` -> `A1 = 15 + 6.545 - 15 = 6.545`
  - Tick 2+: `extracted = 6.545` -> steady-state at `A ≈ 6.545`.

Case C — High-power extractor and depletion flow (shows `maxExtractFrac` enforcement)
- Extractor: `P = 500`, `eff = 1.0`, same-tile -> `requested = 500`. Per-tick cap = `C * maxExtractFrac = 200`.
- Start `A0 = 2000` (full).

Tick-by-tick (rounded to 3 decimals):
- Tick0: `A0 = 2000.000`
- Tick1: `extracted = 200` -> `A1 = 2000 + 6.545 - 200 = 1806.545`
- Tick2: `extracted = 200` -> `A2 = 1806.545 + 6.545 - 200 = 1613.090`
- Tick3: `A3 = 1419.635`
- Tick4: `A4 = 1226.180`
- Tick5: `A5 = 1032.725`
- Tick6: `A6 = 839.270`
- Tick7: `A7 = 645.815`
- Tick8: `A8 = 452.360`
- Tick9: `A9 = 258.905`
- Tick10: `extracted = 200` (still) -> `A10 = 65.450`
- Tick11: `extracted = min(500, 65.450, 200) = 65.450` -> `A11 = 6.545` (then steady-state at regen level)

Observations:
- `maxExtractFrac` bounds per-tick extraction and shapes the depletion curve; high-power extractors consume at up to `C*maxExtractFrac` until remaining `A_t` falls below that cap.
- Adjacent extractors pay a sustained penalty via `adjacencyFactor`, which increases chances of partial fill when `A_t` is small.
- When `extracted < requested` due to availability, the extractor experiences partial fill; when `extracted == requested` but `extracted > R`, the tile will steadily deplete until `A_t` drops low enough that `extracted` becomes limited by availability.

---

## Relationship: resourceRates vs resourceAmounts (glossary/table)

| Term | Stored field | Meaning | Update rule |
|------|--------------|---------|-------------|
| resourceRates | `tile.static.resourceRates` | Deterministic generation rates (units/tick). Calculated from `(seed,x,y)` via noise and mapping. | Used each tick to increase `resourceAmounts` up to `capacity`. |
| resourceAmounts | `tile.dynamic.resourceAmounts` | Current available resource on tile (mutable). | Updated via `A_{t+1} = clamp(A_t + R - extracted, 0, C)`. |

Implementation notes:
- `resourceRates` is static/deterministic and can be recomputed on demand (no persistence required). `resourceAmounts` must be persisted and mutated.

---

## Cross-reference matrix — Biomes × Tile Types × Primary resources (implementation-ready)

This quick matrix maps a biome to its dominant tile types and the primary resources and base ranges you should allow when generating `resourceRates`. It is intended for orientation only; use the canonical tables and formulas below for full derivation.

| Biome \ Primary Tile Types | Primary tile types (dominant) | Primary resource types (highest base ranges) |
|---------------------------:|-------------------------------|---------------------------------------------|
| Ocean       | Water, Oil                      | Oil [3-6], Crystal [0-1]                     |
| Desert      | Sand, Plains                    | Oil [2-5], Crystal [2-4], Carbon [0-1]      |
| Jungle      | Forest, Swamp                   | Carbon [4-7], Oil [1-3]                     |
| Forest      | Forest, Plains                  | Carbon [4-7], Iron [1-3]                    |
| Temperate   | Plains, Forest                  | Carbon [2-4], Iron [1-3], Crystal [0-2]     |
| Tundra      | Ice, Plains                     | Crystal [3-6], Iron [0-2]                   |
| Mountain    | Mountain, Rock                  | Iron [6-10], Crystal [2-4]                  |

Use this matrix as a concise biome-to-tile mapping aid. If a tile type appears in multiple biomes, use that tile type's canonical range and then apply the biome multiplier.

---

## Computing the Full Cross-Reference

All values for resource generation, capacity, and biome multipliers are generated by the formulas and base parameters defined above. The canonical base ranges and capacity values are specified in the tables under **Canonical Base Ranges** and **Canonical base capacity table**. The biome multipliers are specified in the biome × tile type effects table. To compute the full cross-reference across biomes, tile types, and resources, iterate over all combinations and for each:

1. Lookup $[B_{\min}, B_{\max}]$ for the tile type and resource from the Canonical Base Ranges table.
2. Lookup $C_{\text{base}}$ for the tile type and resource from the Canonical base capacity table.
3. Lookup $\text{biomeMultiplier}$ for the biome and resource from the Biome × TileType Effects table.
4. For each tile, compute the actual resource rate and capacity using the formulas:

$$
u_r = \frac{\text{Noise}(\text{seed}, x \cdot \text{freq}_{\text{resource}}, y \cdot \text{freq}_{\text{resource}}, \text{salt}_{\text{resource}}) + 1}{2}
$$

$$
\text{rate}_{\text{base}} = B_{\min} + u_r \cdot (B_{\max} - B_{\min})
$$

$$
\text{rate}_{\text{final}} = \mathrm{clamp}(\text{rate}_{\text{base}} \cdot \text{biomeMultiplier} \cdot S, B_{\min}, B_{\max} \cdot (1 + \text{maxBiomeBonus}))
$$

$$
u_c = \frac{\text{Noise}(\text{seed}, x \cdot \text{freq}_{\text{cap}}, y \cdot \text{freq}_{\text{cap}}, \text{salt}_{\text{capacity}}) + 1}{2}
$$

$$
\text{capacity} = \mathrm{round}(C_{\text{base}} \cdot (1 + \text{capNoiseScale} \cdot u_c) \cdot \text{biomeCapMultiplier})
$$

This process programmatically generates the full cross-reference for any tile given its biome, tile type, and resource, without requiring a duplicated static table in this document.

---

## Implementation checklist (for a future agent)

- Implement seedable Simplex noise accessor `Noise(seed,x,y,salt)` returning `[-1,1]`.
- Add config tables: `baseRanges[tileType][resource]`, `capacityBase[tileType][resource]`, `biomeMultipliers[biome][resource]`.
- Implement `computeResourceRate(seed,x,y,tileType,resource)` using the mapping method above.
- Implement `computeCapacity(seed,x,y,tileType,resource)` using hybrid capacity formula above.
- Implement extraction tick update calling `extracted = min(requested, A_t, C*maxExtractFrac)` and then `A_{t+1} = clamp(A_t + R - extracted,0,C)`.

---

## See Also

- [Map Structure](./map-structure.md)
- [Map Generation](./map-generation.md)

---

## Glossary — key terms (implementation-ready)

- **resourceRates**: Deterministic per-tile, per-resource generation rate (units/tick). Computed from $(\text{seed}, x, y)$ using the noise-to-mapping formula. Stored as $\text{tile.static.resourceRates}$.
- **resourceAmounts**: Mutable stored amount for a given resource on a tile (units). Stored as $\text{tile.dynamic.resourceAmounts}$. Range: $0..\text{capacity}$.
- **capacity (C)**: Maximum storable units of a resource on a tile. Computed via $C_{\text{base}}$, noise, and biome multipliers. See capacity formula: $\text{capacity} = \mathrm{round}(C_{\text{base}} \cdot (1 + \text{capNoiseScale} \cdot u_c) \cdot \text{biomeCapMultiplier})$.
- **extraction**: The act of removing $\text{extracted}$ units from $\text{resourceAmounts}$ per tick by an extractor. Formula: $\text{extracted} = \min(\text{requested}, A_t, C \cdot \text{maxExtractFrac})$ where $\text{requested} = P \cdot \text{eff} \cdot \text{adjacencyFactor}$.
- **biome**: Large-scale environmental classification (e.g. $\text{Forest}$, $\text{Desert}$) that influences $\text{resourceRates}$ via $\text{biomeMultiplier}$ and capacity via $\text{biomeCapMultiplier}$.
- **tileType**: Local terrain/material classification (e.g. $\text{Plains}$, $\text{Rock}$) determining $\text{baseRanges}$ and $C_{\text{base}}$ used by generators.
- **rate_base**: Intermediate computed base rate before biome/global multipliers: $B_{\min} + u_r \cdot (B_{\max} - B_{\min})$.
- **rate_final (R)**: Final deterministic per-tick generation rate after multipliers and clamping: $\text{rate}_{\text{final}} = \mathrm{clamp}(\text{rate}_{\text{base}} \cdot \text{biomeMultiplier} \cdot S, B_{\min}, B_{\max}(1+\text{maxBiomeBonus}))$.
- **Cbase**: Canonical base capacity value per $\text{tileType}$ and $\text{resource}$ from the $\text{capacityBase}$ table.
- **capNoiseScale**: Tunable scale $(0..1)$ that controls how much capacity varies with noise (default $0.5$ recommended).
- **u_r / u_c**: Normalized noise samples in $[0,1]$ used for rate ($u_r$) and capacity ($u_c$) calculations: $u = (\text{Noise}(...) + 1)/2$.
- **P**: Extractor nominal power (units/tick).
- **eff**: Extractor efficiency multiplier $(0 < \text{eff} \leq 1)$.
- **adjacencyFactor**: Penalty multiplier for extraction when extractor is not on the same tile. Default: $1.0$ for $d=0$, $0.8$ for $d=1$. Formula: $\text{adjacencyFactor} = \max(0, 1 - 0.2 \cdot d)$.
- **maxExtractFrac**: Hard per-tick fraction of tile capacity allowed to be extracted (recommended default $0.10 = 10\%$).

