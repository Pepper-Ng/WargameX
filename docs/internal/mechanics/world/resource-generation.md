
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

Given a tile type's base range `[Bmin, Bmax]`, a normalized noise sample $u_r$, a biome multiplier $m$, and a global scaling factor $S$ (default `1.0`):

$$\text{rate}_{\text{base}} = B_{\min} + u_r \cdot (B_{\max} - B_{\min})$$

$$\text{rate}_{\text{final}} = \mathrm{clamp}(\text{rate}_{\text{base}} \cdot m \cdot S,\ B_{\min},\ B_{\max} \cdot (1 + \text{maxBiomeBonus}))$$

Clamping ensures biome bonuses cannot push rates above a safe upper bound.

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

| Biome     | Carbon | Iron | Crystal | Oil  | Cap ×  |
|----------:|-------:|-----:|--------:|-----:|-------:|
| Ocean     | 0.50   | 0.50 | 0.50    | 1.10 | 1.00   |
| Desert    | 0.60   | 0.80 | 1.20    | 1.25 | 1.05   |
| Jungle    | 1.25   | 0.70 | 0.80    | 1.05 | 1.10   |
| Forest    | 1.40   | 1.05 | 0.90    | 0.90 | 1.15   |
| Temperate | 1.00   | 1.00 | 1.00    | 1.00 | 1.00   |
| Tundra    | 0.50   | 0.90 | 1.40    | 0.80 | 0.95   |
| Mountain  | 0.40   | 1.35 | 1.10    | 0.60 | 1.05   |

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
| $R$ | Tile generation rate (`rate_final`) |
| $\text{maxExtractFrac}$ | Per-tick extraction cap as fraction of capacity (default `0.10`) |

### Formulas

$$\text{adjacencyFactor} = \max(0,\ 1 - 0.2 \cdot d)$$

$$\text{requested} = P \cdot \text{eff} \cdot \text{adjacencyFactor}$$

$$\text{extracted} = \min(\text{requested},\ A_t,\ C \cdot \text{maxExtractFrac})$$

$$A_{t+1} = \mathrm{clamp}(A_t + R - \text{extracted},\ 0,\ C)$$

The `maxExtractFrac` cap prevents any extractor from draining more than 10% of a tile's capacity in a single tick. When extraction consistently exceeds regeneration, the tile depletes over time; steady state is reached when `extracted == R`. For non-renewable configurations, $R$ may be set to zero, after which the tile fully depletes without recovery.

---

## See Also

- [Map Structure](./map-structure.md)
- [Map Generation](./map-generation.md)


