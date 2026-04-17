
# Resource Generation

Each tile produces resources at a deterministic rate that depends on its terrain type, biome, and world coordinates. This document covers how those rates are calculated, how much a tile can hold, and how extractors draw from it.

The four resource types are **carbon**, **iron**, **crystal**, and **oil**. A tile's `resourceRates` holds the generation rate for each (static, recomputable from `(seed, x, y)`); `resourceAmounts` holds what the tile currently stores (dynamic, must be persisted).

---

## Generation Rates

A tile's generation rate for a resource is the amount it regenerates per game tick, computed from the tile's type, biome, and a seeded noise function.

### Noise Sampling

The noise function `Noise(seed, x, y, salt)` returns values in `[-1, 1]`. Normalized to `[0, 1]`:

$$u = \frac{\text{Noise}(\text{seed},\ x \cdot f,\ y \cdot f,\ \text{salt}) + 1}{2}$$

Each resource uses a distinct salt and spatial frequency $f$ to prevent rates from correlating — iron uses `f = 0.08` and carbon `f = 0.12`, so their rich patches don't always coincide.

### Rate Formula

Given a tile type's base range `[Bmin, Bmax]`, a normalized noise sample $u_r$, a biome multiplier $m$, a global scaling factor $S$ (default `1.0`), and a per-resource depletion factor $D_r \in [0, 1]$ (see [Depletion](#depletion)):

$$\text{rate}_{\text{base}} = B_{\min} + u_r \cdot (B_{\max} - B_{\min})$$

$$\text{rate}_{\text{final}} = \min(\text{rate}_{\text{base}} \cdot m \cdot S \cdot D_r,\ B_{\max})$$

The `min(…, Bmax)` cap prevents heavily boosted biomes from pushing rates above the tile type's confirmed maximum. When `D_r` reaches `0` for a resource, the tile no longer regenerates that resource.

Biome multipliers are **static** properties fixed by biome type — they do not change during play and have no role in modelling depletion. Time-varying depletion is expressed solely through `D_r`, which is updated each tick as resources are extracted (see [Depletion](#depletion)).

---

## Base Ranges by Tile Type

The `[Bmin, Bmax]` interval per tile type and resource. A `[0, 0]` range means that resource never appears on that tile type.

| Tile Type | Carbon | Iron   | Crystal | Oil    |
|----------:|-------:|-------:|--------:|-------:|
| Plains    | [2,4]  | [1,3]  | [0,2]   | [1,3]  |
| Sand      | [0,1]  | [1,2]  | [2,4]   | [2,5]  |
| Forest    | [4,7]  | [0,2]  | [0,2]   | [1,3]  |
| Swamp     | [3,6]  | [0,1]  | [0,1]   | [2,4]  |
| Rock      | [0,1]  | [4,7]  | [0,2]   | [0,2]  |
| Mountain  | [0,1]  | [6,10] | [2,4]   | [0,1]  |
| Water     | [0,0]  | [0,0]  | [0,1]   | [3,6]  |
| Oil       | [0,0]  | [1,2]  | [0,1]   | [7,10] |
| Ice       | [0,1]  | [0,2]  | [3,6]   | [0,1]  |

---

## Biome Multipliers

Each biome scales both rates and capacity. This gives every biome a distinct strategic identity — Jungles overflow with carbon, Mountains yield heavy iron, Deserts hold oil and crystal.

The sum of a biome's four resource multipliers (`Σm`) determines its **resource richness tier**, which governs spawn point eligibility (see [Map Generation: Spawn Point Assignment](./map-generation.md#spawn-point-assignment)):

- **Rich** — `Σm > 4.25` — not spawn-eligible (structural resource advantage)
- **Moderate** — `3.75 ≤ Σm ≤ 4.25` — spawn-eligible
- **Poor** — `Σm < 3.75` — not spawn-eligible (structural resource disadvantage)

| Biome     | Carbon | Iron | Crystal | Oil  | Cap ×  | Σm   | Tier     |
|----------:|-------:|-----:|--------:|-----:|-------:|-----:|----------|
| Ocean     | 0.50   | 0.50 | 0.50    | 1.10 | 1.00   | 2.60 | Poor     |
| Desert    | 0.70   | 0.80 | 1.20    | 1.25 | 1.05   | 3.95 | Moderate |
| Jungle    | 1.10   | 0.80 | 0.80    | 1.05 | 1.10   | 3.75 | Moderate |
| Forest    | 1.10   | 1.05 | 0.90    | 0.90 | 1.15   | 3.95 | Moderate |
| Temperate | 1.00   | 1.00 | 1.00    | 1.00 | 1.00   | 4.00 | Moderate |
| Tundra    | 0.50   | 0.90 | 1.40    | 0.80 | 0.95   | 3.60 | Poor     |
| Mountain  | 0.40   | 1.35 | 1.10    | 0.60 | 1.05   | 3.45 | Poor     |

### Balance Notes

The `Σm` column is a first-order proxy for spawn eligibility; it captures whether a biome's multipliers sum to roughly `4.0` but does not account for the tile type distribution inside each biome. The real check is the **weighted effective output** — each resource's average base rate (from the tile type distribution) multiplied by the biome's per-resource multiplier:

| Biome     | Carbon eff. | Iron eff. | Crystal eff. | Oil eff. | Total eff. | vs Temperate |
|-----------|-------------|-----------|--------------|----------|------------|-------------|
| Forest    | 4.58        | 1.58      | 0.91         | 1.99     | 9.06       | +5%         |
| Jungle    | 4.72        | 0.84      | 0.74         | 2.61     | 8.91       | +3%         |
| Desert    | 0.55        | 1.80      | 2.98         | 3.87     | 9.20       | +7%         |
| Temperate | 3.18        | 2.18      | 1.19         | 2.08     | 8.62       | —           |

Forest and Jungle are inherently carbon-rich in composition because their tile type distributions skew toward Forest-type tiles (avg carbon base `5.5`). Their Carbon multipliers are therefore set to `1.10` — the tile mix already delivers a carbon-favoured profile, so a modest multiplier is sufficient to reinforce that character without disproportionately inflating the biome's absolute output relative to Temperate.

The residual ±7% variance between the four Moderate biomes is well within the natural tile-to-tile noise variation (each tile's rate is independently noise-sampled across its full `[Bmin, Bmax]` range). In practice, individual spawn region quality varies more than the biome average, masking the aggregate difference.

---

## Depletion

Each resource slot on a tile carries a **depletion factor** `D_r ∈ [0, 1]`, one per resource. `D_r` is a dynamic state variable — it starts at `1.0` on a fresh tile, decreases as the tile is exploited, and scales down `rate_final` toward zero as it does. When `D_r` reaches `0` the tile no longer regenerates that resource.

The four resources carry independent factors — heavy iron extraction depletes iron without affecting carbon, crystal, or oil on the same tile.

`D_r` is intentionally kept as a general-purpose state variable rather than a derived quantity. Its default driving rule is extraction-based decay (below), but future mechanics — upgrades, environmental stress, world events — can modify `D_r` directly through the same interface without changing the rate formula.

### Default Decay Rule

Each tick, `D_r` decreases in proportion to how much was just extracted relative to the tile's capacity:

$$D_r^{t+1} = \max\!\left(0,\ D_r^t - \frac{\text{extracted}_r}{C_r \cdot \text{depletionScale}}\right)$$

`depletionScale` (default `50`) controls how many full-capacity extraction cycles the tile can sustain before `D_r` reaches zero. A higher value makes tiles last longer; a lower value makes them more fragile. Because `depletionScale` is a global config parameter it can be tuned without touching the per-tile data model.

When `D_r = 0` the tile generates nothing for that resource. Extraction is still possible for as long as stored amounts (`resourceAmounts`) are non-zero, but no new regeneration will occur.

### Recovery

By default, depletion is **permanent** — `D_r` never increases once it falls. An optional `recoveryRate` parameter (default `0.0`) can be set globally to allow `D_r` to slowly recover each tick where no extraction occurs:

$$D_r^{t+1} = \min\!\left(1,\ D_r^t + \text{recoveryRate}\right) \quad \text{(only when no extraction this tick)}$$

This is a game-wide configuration switch, not a per-tile override.

### Visibility

- **Tiles without a player structure**: depletion level is hidden from all players.
- **Tiles with an owner structure**: the owning player can inspect the current `D_r` per resource (e.g. *Iron: 63% remaining*).


---

## Capacity

Each tile can hold a finite amount of each resource. Capacity is derived from a base value per tile type, a noise variation, and the biome capacity multiplier:

$$C_{\text{base}} = \text{capacityBase}[\text{tileType}][\text{resource}]$$

$$u_c = \frac{\text{Noise}(\text{seed},\ x \cdot f_{\text{cap}},\ y \cdot f_{\text{cap}},\ \text{salt}_{\text{cap}}) + 1}{2}$$

$$C = \mathrm{round}\left(C_{\text{base}} \cdot (1 + \text{capNoiseScale} \cdot u_c) \cdot \text{biomeCapMultiplier}\right)$$

With `capNoiseScale = 0.5` and `f_cap = 0.04`, capacity varies smoothly across the map, up to +50% above the base value.

### Base Capacities by Tile Type

| Tile Type | Carbon | Iron  | Crystal | Oil   |
|----------:|-------:|------:|--------:|------:|
| Plains    | 2000   | 1500  | 500     | 1000  |
| Sand      | 500    | 1000  | 1500    | 2000  |
| Forest    | 4000   | 800   | 600     | 1200  |
| Swamp     | 2500   | 600   | 400     | 2000  |
| Rock      | 800    | 3000  | 800     | 600   |
| Mountain  | 600    | 5000  | 2000    | 500   |
| Water     | 0      | 0     | 300     | 3000  |
| Oil       | 0      | 800   | 400     | 12000 |
| Ice       | 200    | 800   | 2500    | 200   |

---

## Extraction

Extractors draw resources from a tile each tick. An extractor placed directly on a tile operates at full efficiency; one placed on an adjacent tile incurs a 20% penalty. Extraction beyond one tile's distance is not permitted.

### Variables

| Symbol | Meaning |
|--------|---------|
| $P$ | Nominal extractor power (units/tick) |
| $\text{eff}$ | Efficiency multiplier, $0 < \text{eff} \leq 1$ |
| $d$ | Distance to resource tile (`0` = same, `1` = adjacent) |
| $A_t$ | Resource amount on the tile at tick $t$ |
| $C$ | Tile capacity for this resource |
| $R$ | Tile generation rate (`rate_final`, which already incorporates $D_r$) |
| $\text{maxExtractFrac}$ | Per-tick extraction cap as fraction of capacity (default `0.10`) |

### Formulas

$$\text{adjacencyFactor} = \max(0,\ 1 - 0.2 \cdot d)$$

$$\text{requested} = P \cdot \text{eff} \cdot \text{adjacencyFactor}$$

$$\text{extracted} = \min(\text{requested},\ A_t,\ C \cdot \text{maxExtractFrac})$$

$$A_{t+1} = \mathrm{clamp}(A_t + R - \text{extracted},\ 0,\ C)$$

The `maxExtractFrac` cap prevents any extractor from draining more than 10% of a tile's capacity in a single tick. Steady state is reached when `extracted == R`.

Each tick's `extracted_r` value also drives the depletion decay rule — `D_r` decreases proportionally, which in turn gradually reduces `R` on subsequent ticks (see [Depletion](#depletion)).

---

## See Also

- [Map Structure](./map-structure.md)
- [Map Generation](./map-generation.md)


