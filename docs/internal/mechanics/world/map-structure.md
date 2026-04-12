
# Map Structure (Planned Model)

This document defines the **canonical world tile model**, coordinate semantics, and the relationship between biomes, tile types, and resources for the planned multi-resource system.

---

## Tile as the Atomic World Unit

A **tile** is the smallest addressable world element, used for generation, persistence, and rendering. Each tile is uniquely identified by its `(x, y)` coordinate and is the fundamental unit for all world systems.

---

## Tile Properties

Tile properties are divided into **static** (deterministic, recomputable) and **dynamic** (mutable, runtime) fields.

### Static Properties (deterministic, from `(seed, x, y)`)
- `x`, `y`: Integer world coordinates
- `biome`: Environmental classification (see Biomes below)
- `tileType`: Terrain/material classification (see Tile Types below)
- `temperature`: Determined by latitude and noise
- `resourceRates`: Generation rates for each resource type (see Resource Model)
- `passableBy`: Movement eligibility (planned: per-unit-type flags)

### Dynamic Properties (mutable)
- `resourceAmounts`: Current available resources (per type)
- `occupants`: Entities present (bases, forces, structures)
- `meta`: Optional debug or generated metadata

---

## Coordinate System

- Origin-centered integer grid: `(x, y)`
- No floating-point positions at tile level
- `y = 0`: Equatorial band (warmest)
- Increasing |y|: Colder regions
- Query windows: Centered on a coordinate, with a defined range
- Determinism: Same `(seed, x, y)` always yields the same static properties

---

## Canonical Biomes (Planned)

| Biome     | Description                        |
|-----------|------------------------------------|
| Ocean     | Deep water, islands                |
| Desert    | Hot, arid, sandy                   |
| Jungle    | Dense, humid, lush                 |
| Forest    | Temperate, wooded                  |
| Temperate | Mixed grassland/forest             |
| Tundra    | Cold, sparse, icy                  |
| Mountain  | High elevation, rocky, cold        |

---

## Canonical Tile Types (Planned)

| Tile Type | Description                        |
|-----------|------------------------------------|
| Plains    | Grassland, fertile                 |
| Sand      | Dunes, arid                        |
| Forest    | Trees, wooded                      |
| Swamp     | Wetland, marsh                     |
| Rock      | Rocky, mineral-rich                |
| Mountain  | Steep, mineral-rich                |
| Water     | Shallow/deep water                 |
| Oil       | Oil field, tar sands               |
| Ice       | Frozen, permafrost                 |

**Mapping Rules:**
- Tile type is derived from biome, local noise, and feature generators (see [Map Generation](./map-generation.md)).
- Each biome has a weighted distribution of tile types (see Map Generation for tables).

---

## Tile Type and Biome Relationship (Planned)

- Each tile belongs to exactly one biome and one tile type.
- Biome determines the dominant tile type distribution and resource bonuses.
- Tile type determines base resource rates and passability.
- Some tile types (e.g., Oil, Water) are rare outside their primary biome.

---

## Multi-Resource Model (Planned)

Each tile has a `resourceRates` object specifying the per-resource generation rate (see [Resource Generation](./resource-generation.md)).

```json
resourceRates: {
	carbon: number,   // e.g. 0.0 - 10.0
	iron: number,     // e.g. 0.0 - 10.0
	crystal: number,  // e.g. 0.0 - 10.0
	oil: number       // e.g. 0.0 - 10.0
}
```

**Resource rates are fully determined by `(seed, x, y)` and tile type, with biome and noise modifiers.**

---

## What Can Exist on a Tile

- Terrain classification (always present)
- Zero or one base (player structure)
- Zero or more forces (units), subject to stacking/movement rules
- Resource amounts (per resource type)

---

## Determinism Invariant

- The same `(seed, x, y)` always yields the same static properties unless explicitly regenerated.
- For generation details, see [Map Generation](./map-generation.md).

---

## Edge Cases and Special Rules

- Tiles at biome boundaries use the dominant biome for bonuses.
- Tiles with zero resource rate for a resource never generate that resource.
- Some tile types (e.g., Water, Oil) are not buildable; see extraction rules in [Resource Generation](./resource-generation.md).

---

## Notes

This document defines the **world contract** and must remain aligned with:
- Generation logic
- Persistence model
- Rendering systems

---


## Expanded Glossary (Implementation-Ready)

This glossary defines all referenced and planned terms for the world, map, and resource systems. All terms marked **FUTURE/PLANNED** are included for clarity and future-proofing.

---

- **resourceRates** (static/deterministic): Per-tile, per-resource generation rate (units/tick). Computed deterministically from `(seed, x, y)` using the mapping formula (see [Resource Generation](./resource-generation.md)). Not persisted; can be recomputed on demand.

- **resourceAmounts** (dynamic/mutable): Current stored amount of each resource on a tile (units, range: 0..capacity). Updated every tick by regeneration and extraction. This field **must be persisted**.

- **capacity (C)**: Maximum storable units of a resource on a tile. Computed from `Cbase`, noise, and biome multipliers. See capacity formula in [Resource Generation](./resource-generation.md).

- **Cbase**: Canonical base capacity value per `tileType` and `resource` from the capacity table.

- **capNoiseScale**: Tunable scale (0..1) controlling how much capacity varies with noise (default 0.5).

- **u_r / u_c**: Normalized noise samples in [0,1] used for rate (`u_r`) and capacity (`u_c`) calculations: `u = (Noise(...) + 1)/2`.

- **rate_base**: Intermediate computed base rate before biome/global multipliers: `Bmin + u_r * (Bmax - Bmin)`.

- **rate_final (R)**: Final deterministic per-tick generation rate after multipliers and clamping: `rate_final = clamp(rate_base * biomeMultiplier * S, Bmin, Bmax*(1+maxBiomeBonus))`.

- **extraction**: The act of removing `extracted` units from `resourceAmounts` per tick by an extractor. Formula: `extracted = min(requested, A_t, C * maxExtractFrac)` where `requested = P * eff * adjacencyFactor`.

- **P**: Extractor nominal power (units/tick).

- **eff**: Extractor efficiency multiplier (0 < eff <= 1).

- **adjacencyFactor**: Penalty multiplier for extraction when extractor is not on the same tile. Default: `1.0` for d=0, `0.8` for d=1. Formula: `adjacencyFactor = max(0, 1 - 0.2 * d)`.

- **maxExtractFrac**: Hard per-tick fraction of tile capacity allowed to be extracted (default 0.10 = 10%).

- **biome**: Large-scale environmental classification (e.g., `Forest`, `Desert`) that influences `resourceRates` via `biomeMultiplier` and capacity via `biomeCapMultiplier`.

- **biomeMultiplier**: Per-biome, per-resource multiplier applied to `rate_base` to produce `rate_final`.

- **biomeCapMultiplier**: Per-biome multiplier applied to capacity calculation.

- **tileType**: Local terrain/material classification (e.g., `Plains`, `Rock`) determining `baseRanges` and `Cbase` used by generators.

- **baseRanges**: Table of `[Bmin, Bmax]` per `tileType` and resource, used for mapping noise to resource rates.

- **Noise(seed, x, y, salt)**: Seeded noise function returning [-1,1]; normalize with `(Noise+1)/2`.

- **freq_***: Frequency multiplier used when sampling noise for different systems (temp/biome/tile/resource/capacity).

- **feature generator override**: A generator result (e.g., river or mountain feature) that explicitly overrides local biome/tileType selection. Must compose deterministically with base noise.

---

### FUTURE / PLANNED Terms

- **multi-resource extraction buildings**: Planned buildings that extract multiple resources from the same tile simultaneously. Each resource is extracted independently using the standard extraction formula, with possible combined throughput constraints.

- **resource migration / diffusion / seepage**: Planned model where resources can move between adjacent tiles over time according to gradient-based transfer; typically implemented as per-tick fraction transfers capped by neighbor capacities.

- **regional density rebalancing**: FUTURE process that periodically inspects contiguous tile regions and adjusts `resourceRates` or `resourceAmounts` to maintain desired regional distributions; used for long-term game balance adjustments.

- **dynamic resource events**: FUTURE short- or mid-duration modifiers that alter `rate_final`, `biomeMultiplier`, or `biomeCapMultiplier` in a region. These must be gated and reversible and should have contractual application logic for persistence and rollback.

- **biome migration / temporal biome migration**: FUTURE process where biomes shift over long time horizons, changing `biomeMultiplier` and tile distributions. Requires migration tooling to update persisted `resourceAmounts` and should be controlled to avoid breaking player expectations.

- **regional state influence**: FUTURE feature where regional/global states (weather, events) modify `R` or `biomeMultiplier` for multiple tiles for a bounded time window. These modifiers must be applied via explicit contracts to preserve auditability.

- **non-deterministic player-driven changes**: FUTURE actions that would break strict seed determinism; must be gated and accompanied by migration and persistence strategies.

- **dynamic per-player tile ownership effects**: FUTURE feature where tile-level regeneration or `rate_final` may be altered by ownership. Requires explicit contract for persistence and rollback.

- **passability exceptions / stacking**: FUTURE rules that alter unit movement/stacking based on unit types and tile flags; will require pathfinding and persistence updates.


All terms above are defined for future implementers. For the single authoritative cross-reference of biome × tileType × resource, see the "Comprehensive Cross-Reference Table" in [Resource Generation](./resource-generation.md).
---

## Cross-check matrix reference (short)

For quick lookups in code, maintain a single canonical mapping table keyed by `(biome, tileType)` that returns:
- allowed resources (boolean per resource)
- base ranges `[Bmin,Bmax]` used by the mapping formula
- Cbase (capacity base) used by the capacity formula

Example entry form (JSON-like):

```
mapRules[biome][tileType] = {
	allowed: { carbon: true, iron: true, crystal: false, oil: true },
	baseRange: { carbon: [2,4], iron: [1,3], crystal: [0,0], oil: [1,3] },
	capacityBase: { carbon:2000, iron:1500, crystal:0, oil:1000 }
}
```

Keep this table in sync with the tables and formulas in [Resource Generation](./resource-generation.md).

Reference (single authoritative source):

- The full, canonical cross-reference CSV (biome × tileType × resource → allowed, baseRange, Cbase, biomeMultiplier) is maintained in [Resource Generation](./resource-generation.md) under "Comprehensive Cross-Reference Table (biome × tileType × resource)". Implementers should load that CSV or mirror it into `mapRules[biome][tileType]` at startup rather than duplicating the table across files.

---

> **Canonical Cross-Reference (authoritative):** For the single source of truth (biome × tileType × resource and all multipliers/capacities), see the "Comprehensive Cross-Reference Table (biome × tileType × resource)" in [Resource Generation](./resource-generation.md). Load or reference that CSV/table at startup rather than duplicating values here.
<div class="callout crossref" style="border:1px solid #cce5ff;background:#f0f8ff;padding:10px;border-radius:6px">
<strong>Canonical Cross-Reference (authoritative):</strong>
Use the "Comprehensive Cross-Reference Table (biome × tileType × resource)" in [Resource Generation](./resource-generation.md) as the single source of truth for base ranges, capacities, and `biomeMultiplier` values. Load or mirror that CSV at startup rather than duplicating values across docs or code.
</div>


## Biome × TileType Effects (implementation summary)

This quick reference shows recommended biome multipliers and extraction modifiers implementers should use by default. Values are multiplicative for rates/capacities and absolute for extraction settings.

| Biome     | Carbon mul | Iron mul | Crystal mul | Oil mul | biomeCapMultiplier | notes |
|----------:|-----------:|---------:|-----------:|-------:|-------------------:|-------|
| Ocean     | 0.5        | 0.5      | 0.5        | 1.10   | 1.00               | Oil favored |
| Desert    | 0.6        | 0.8      | 1.20       | 1.25   | 1.05               | Crystal & Oil bias |
| Jungle    | 1.25       | 0.7      | 0.8        | 1.05   | 1.10               | Carbon-rich |
| Forest    | 1.40       | 1.05     | 0.9        | 0.9    | 1.15               | Carbon dominant |
| Temperate | 1.00       | 1.00     | 1.00       | 1.00   | 1.00               | Baseline |
| Tundra    | 0.5        | 0.9      | 1.40       | 0.8    | 0.95               | Crystal favored |
| Mountain  | 0.4        | 1.35     | 1.10       | 0.6    | 1.05               | Iron/heavy |

Extraction defaults (global):

- `maxExtractFrac`: 0.10 (10% of capacity per tick)
- `adjacencyFactor`: same-tile d=0 => 1.0; adjacent d=1 => 0.8; beyond 1 => 0 (disallowed)

Use these as defaults; game designers may tune per-biome or per-tile overrides in `biomeMultipliers` and `biomeCapMultipliers` config tables.

---

## Glossary — key terms (implementation-ready)

- **resourceRates**: Deterministic per-tile, per-resource generation rate (units/tick). Computed from `(seed,x,y)` using the noise → mapping formula.
- **resourceAmounts**: Mutable stored amount for a given resource on a tile (units). Range: `0..capacity`.
- **capacity (C)**: Maximum storable units of a resource on a tile. Implemented using `Cbase`, noise, and biome multipliers.
- **extraction**: Removing resource units from `resourceAmounts` via buildings or units. See extraction formula in [Resource Generation](./resource-generation.md).
- **biome**: Large-scale environmental classification affecting multipliers and tile distributions.
- **tileType**: Local terrain classification that determines `baseRanges` and `Cbase`.

Additional glossary entries (expanded for FUTURE items):

- **diffusion / seepage**: A proposed FUTURE mechanic where resource amounts may redistribute to adjacent tiles over time according to local gradients — typically implemented as per-tick transfer fraction `f_diffuse` applied to neighboring tiles, constrained by capacity.
- **multi-resource extraction building**: A planned building that extracts multiple resources simultaneously from one tile according to configured ratios. Implementation should define per-tick `requested[resource]` and apply standard `extracted = min(requested, A_t, C * maxExtractFrac)` per resource.
- **regional density rebalancing**: A FUTURE process that periodically inspects contiguous tile regions and adjusts `resourceRates` or `resourceAmounts` to maintain desired regional distributions; used for long-term game balance adjustments.
- **dynamic resource events**: Temporary modifiers (events) that alter `rate_final` or `biomeMultiplier` for a region or globally for a duration. These are FUTURE and must be applied via guarded event contract to preserve determinism when required.

---

<div class="callout future" style="border:1px solid #f0c040;background:#fff9e6;padding:12px;border-radius:6px">
<strong>FUTURE / PLANNED</strong>
<ul>
	<li>Dynamic per-player tile ownership effects (e.g., ownership-based regen changes).</li>
	<li>Regional resource redistribution (diffusion/seepage across tile clusters).</li>
	<li>Per-unit tile passability exceptions and advanced stacking rules.</li>
</ul>
</div>

The following items are intentionally marked FUTURE/PLANNED and are boxed here for visibility and contractual clarity. Implementers must not rely on these features unless they are explicitly enabled and documented as implemented.

- Dynamic per-player tile ownership effects (e.g., ownership-based regen changes).
- Regional resource redistribution (diffusion/seepage across tile clusters).
- Per-unit tile passability exceptions and advanced stacking rules.

Additional notes on FUTURE items (definitions and guidance):

- **dynamic per-player tile ownership effects**: FUTURE feature where tile-level regeneration or `rate_final` may be altered by ownership. Requires explicit contract for persistence and rollback.
- **regional resource redistribution**: FUTURE diffusion/seepage model for resourceAmounts; implementers should plan for per-tick transfer fractions and capacity-aware constraints.
- **passability exceptions / stacking**: FUTURE rules that alter unit movement/stacking based on unit types and tile flags; will require pathfinding and persistence updates.

