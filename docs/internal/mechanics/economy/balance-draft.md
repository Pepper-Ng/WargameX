# Resource Balance — Design Working Document

> **Status:** Draft for discussion. No values here are locked.
> **Method:** Bottom-up derivation from tile-type base rates, tile distribution weights, biome multipliers, and yield-based processing recipes — cross-checked against target worth ratios and spawn fairness.

---

## 1. Design Goal

Establish a self-consistent set of values across:

1. **Raw resource relative worth** — Carbon : Iron : Crystal : Oil
2. **Processing recipes with yield factors** — how raw resources transform into refined and advanced resources
3. **Tile-type base rate ranges** — per resource per tile type
4. **Tile distribution weights** — tile type probability per biome
5. **Biome multipliers** — per-resource scaling per biome
6. **Spawn eligibility** — which biomes qualify as balanced for player spawns
7. **Raw-vs-refined substitution** — whether players may bypass refining at a cost premium

These systems form a feedback loop. This document resolves the loop by fixing a target worth ratio, deriving what the other systems must look like, and verifying internal consistency.

---

## 2. Target Worth Ratios

| Resource | Symbol   | Target Worth |
|----------|----------|-------------|
| Carbon   | $v_C$    | **1.0**     |
| Oil      | $v_O$    | **1.5**     |
| Iron     | $v_{Fe}$ | **2.0**     |
| Crystal  | $v_{Cr}$ | **3.0**     |

These encode the intended scarcity ordering: Carbon is common (workhorse), Oil is moderate, Iron is scarce, Crystal is the premium strategic resource. Worth is anchored to scarcity in spawn-eligible biomes.

---

## 3. The Yield-Based Processing Model

### 3.1 Recipe Table

Recipes express total input and total output per batch. The yield (output count) is set to match the total input unit count, meaning production **conserves volume** — you put in N mixed resource units and get out N units of a single processed resource.

#### Tier 1 — Raw Resources

| Resource      |
|--------------|
| **Carbon**      |
| **Iron** | 
| **Crystal** | 
| **Oil**        |

#### Tier 2 — Refined Resources

| Product      | Input           | Yield | Per Unit                |
|--------------|-----------------|-------|-------------------------|
| **Steel**       | 1 Carbon + 2 Iron     | **3** | ⅓C + ⅔Fe per Steel     |
| **Electronics** | 2 Iron + 3 Crystal    | **5** | ⅖Fe + ⅗Cr per Electronics |
| **Fuel**        | 1 Carbon + 1.5 Oil    | **2.5** | 0.4C + 0.6O per Fuel  |

> **Fuel batch note:** In integer production, batch size 2 → 2 Carbon + 3 Oil → 5 Fuel (doubling inputs and yield).

#### Tier 3 — Advanced Resources

| Product       | Input                    | Yield   | Per Unit                     |
|---------------|--------------------------|---------|------------------------------|
| **Composite**    | 3 Steel + 5 Electronics    | **8**   | ⅜ Steel + ⅝ Electronics per Composite |
| **Plasma**       | 2.5 Fuel + 3 Crystal      | **5.5** | 5/11 Fuel + 6/11 Crystal per Plasma |

> **Plasma batch note:** In integer production, batch size 2 → 5 Fuel + 6 Crystal → 11 Plasma.

### 3.2 The Volume-Conservation Property

Every recipe conserves total unit count:

| Recipe | Input Units | Output Units | Ratio |
|--------|------------|-------------|-------|
| Steel | 1 + 2 = 3 | 3 | 1:1 |
| Electronics | 2 + 3 = 5 | 5 | 1:1 |
| Fuel | 1 + 1.5 = 2.5 | 2.5 | 1:1 |
| Composite | 3 + 5 = 8 | 8 | 1:1 |
| Plasma | 2.5 + 3 = 5.5 | 5.5 | 1:1 |

This is an elegant design property:

- **Storage is conserved.** If a base had room for the inputs, it has room for the outputs.
- **Worth is conserved.** Total worth of inputs = total worth of outputs. Processing transforms resource form, it does not inflate or deflate value.
- **Per-unit worth is a weighted average.** The per-unit worth of any processed resource is exactly the weighted average of its inputs' per-unit worths. This prevents worth explosion at higher tiers.

### 3.3 Per-Unit Worth Hierarchy

Computed as $W = \frac{\sum \text{input}_i \times v_i}{\text{yield}}$:

**Tier 2:**

$$W_{\text{Steel}} = \frac{1 \times 1 + 2 \times 2}{3} = \frac{5}{3} = \mathbf{1.667}$$

$$W_{\text{Electronics}} = \frac{2 \times 2 + 3 \times 3}{5} = \frac{13}{5} = \mathbf{2.600}$$

$$W_{\text{Fuel}} = \frac{1 \times 1 + 1.5 \times 1.5}{2.5} = \frac{3.25}{2.5} = \mathbf{1.300}$$

**Tier 3:**

$$W_{\text{Composite}} = \frac{3 \times 1.667 + 5 \times 2.600}{8} = \frac{5.0 + 13.0}{8} = \frac{18.0}{8} = \mathbf{2.250}$$

$$W_{\text{Plasma}} = \frac{2.5 \times 1.300 + 3 \times 3.0}{5.5} = \frac{3.25 + 9.0}{5.5} = \frac{12.25}{5.5} = \mathbf{2.227}$$

**Full hierarchy, sorted by per-unit worth:**

| Rank | Resource | Type | Worth / Unit |
|------|----------|------|-------------|
| 1 | Carbon | Raw | 1.000 |
| 2 | Fuel | Refined | 1.300 |
| 3 | Oil | Raw | 1.500 |
| 4 | Steel | Refined | 1.667 |
| 5 | Iron | Raw | 2.000 |
| 6 | Plasma | Advanced | 2.227 |
| 7 | Composite | Advanced | 2.250 |
| 8 | Electronics | Refined | 2.600 |
| 9 | Crystal | Raw | 3.000 |

**Key observations:**

1. **All 9 resources fall within a 1.0–3.0 range.** No explosive worth at higher tiers. The economy stays manageable from early to late game.

2. **Crystal is the most valuable resource per unit in the entire game** — even above both advanced resources. Crystal's scarcity and demand from two processing chains simultaneously justifies this.

3. **Refined products sit between their inputs in per-unit worth.** Steel (1.667) sits between Carbon (1.0) and Iron (2.0). Electronics (2.600) sits between Iron (2.0) and Crystal (3.0). Fuel (1.300) sits between Carbon (1.0) and Oil (1.5). This is the weighted-average effect.

4. **Composite ≈ Plasma in per-unit worth** (2.250 vs 2.227) — essentially parity. This is a desirable property: the two advanced resources are interchangeable in market value, so the choice of which path to pursue is purely strategic (which raw resources you can access), not driven by inherent worth inequality.

### 3.4 Batch-Level Raw Resource Demand

While per-unit worths are near-equal, the batch-level investment is different:

**One batch of Composite (yields 8):**

Raw breakdown: 3×(⅓C + ⅔Fe) + 5×(⅖Fe + ⅗Cr) = **1C + 4Fe + 3Cr**

| Resource | Qty | Worth | % of Batch Worth |
|----------|-----|-------|-----------------|
| Carbon | 1 | 1.0 | 6% |
| Iron | 4 | 8.0 | 44% |
| Crystal | 3 | 9.0 | 50% |
| **Total** | **8** | **18.0** | |

**One batch of Plasma (yields 5.5):**

Raw breakdown: 2.5×(0.4C + 0.6O) + 3Cr = **1C + 1.5O + 3Cr**

| Resource | Qty | Worth | % of Batch Worth |
|----------|-----|-------|-----------------|
| Carbon | 1 | 1.0 | 8% |
| Oil | 1.5 | 2.25 | 18% |
| Crystal | 3 | 9.0 | 73% |
| **Total** | **5.5** | **12.25** | |

**Batch investment ratio:** 18.0 / 12.25 = **1.47:1** — Composite batches require ~47% more total raw worth investment but produce ~45% more output units (8 vs 5.5). This means Composite production is "chunkier" (bigger investment per cycle, more output) while Plasma production is more fluid.

### 3.5 Combined End-Game Raw Demand

For a player producing one batch each of Composite and Plasma:

| Resource | Composite Batch | Plasma Batch | Combined | % of Raw Units | Worth | % of Worth |
|----------|---------------|-------------|----------|---------------|-------|-----------|
| Carbon | 1 | 1 | **2** | 15% | 2.0 | 7% |
| Iron | 4 | 0 | **4** | 30% | 8.0 | 26% |
| Crystal | 3 | 3 | **6** | 44% | 18.0 | 60% |
| Oil | 0 | 1.5 | **1.5** | 11% | 2.25 | 7% |
| **Total** | | | **13.5** | 100% | **30.25** | 100% |

**All four raw resources are needed.** Crystal dominates worth (60%), Iron provides volume for the Composite path (30% of raw units), and Carbon/Oil serve as accessible co-inputs. No resource is irrelevant at end-game.

### 3.6 Composite vs Plasma — Strategic Differentiation

Despite near-equal per-unit worth, the two advanced resources have fundamentally different supply chains:

| Axis | Composite | Plasma |
|------|-----------|--------|
| Theme | Industrial supremacy | Energy / Technological supremacy |
| Primary raw | Iron (4 per batch) | Oil (1.5 per batch) |
| Secondary raw | Crystal (3 per batch) | Crystal (3 per batch) |
| Filler raw | Carbon (1 per batch) | Carbon (1 per batch) |
| Exclusive raw | **Iron** (not used in Plasma) | **Oil** (not used in Composite) |
| Expansion target | Mountain biome (Iron) | Ocean / Water tiles (Oil) |
| Shared bottleneck | Crystal | Crystal |
| Batch investment | 18.0 worth (heavy) | 12.25 worth (lighter) |
| Batch output | 8 units | 5.5 units |
| Unit archetype (suggested) | Heavy armor, fortifications, siege | Energy weapons, propulsion, shields |

The near-parity in per-unit worth but divergent supply chains creates a clean strategic choice: pursue Composite if you control Iron-rich territory, pursue Plasma if you control Oil-rich territory. Both paths compete for Crystal, creating a universal bottleneck that drives expansion and trade.

### 3.7 Crystal as Cross-Path Bottleneck

Crystal appears in both Tier 2 chains:
- **Composite path:** 3 Crystal per batch (via 5 Electronics, each consuming ⅗ Crystal)
- **Plasma path:** 3 Crystal per batch (direct input)

A player pursuing both top-tier products needs **6 Crystal per combined cycle**. Crystal's share of combined worth (60%) makes it the dominant strategic resource at end-game. This is intentional — Crystal pressure drives expansion into Desert, Tundra, and Ice-rich territories.

### 3.8 Full Dependency Graph

```
Carbon ──┬── Steel (1C + 2Fe → 3 Steel) ──── Composite (3S + 5E → 8 Composite)
         │                                              ↑
Iron ────┼────────────────────── Electronics (2Fe + 3Cr → 5 Electronics)
         │                              ↑
Crystal ─┼──────────────────────────────┘
         │
         ├────────────────────── Plasma (2.5 Fuel + 3Cr → 5.5 Plasma)
         │                         ↑
Oil ─────┴── Fuel (1C + 1.5O → 2.5 Fuel)
```

```
          Per-Batch Raw Breakdown
          ────────────────────────
  8 Composite =  1 Carbon  +  4 Iron  +  3 Crystal
  5.5 Plasma  =  1 Carbon  +  1.5 Oil +  3 Crystal
```

---

## 4. Tile-Type Base Rate Ranges

### 4.1 Current Ranges (from resource-generation.md)

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

### 4.2 Issue: Mountain Dual Dominance

Mountain tiles produce top Iron [6,10] AND significant Crystal [2,4]. With Iron worth 2.0 and Crystal worth 3.0, Mountain tiles have a combined worth-weighted midpoint of 26.25 — by far the highest of any tile type. This dual strength makes the Mountain biome disproportionately valuable as an expansion target and harder to balance.

Ice tiles (Crystal [3,6]) should be the premier Crystal source, with Mountains primarily serving Iron.

### 4.3 Recommended Change

**Mountain Crystal: [2,4] → [1,3]** (midpoint 3.0 → 2.0)

This lowers Mountain tile worth-weighted total from 26.25 → 23.25 — still clearly premium (thanks to Iron), but less dominant. Mountain retains its clear identity as the top Iron source; Crystal supremacy shifts to Ice tiles (midpoint 4.5).

### 4.4 Recommended Base Ranges (Final)

| Tile Type | Carbon | Iron   | Crystal     | Oil    |
|----------:|-------:|-------:|------------:|-------:|
| Plains    | [2,4]  | [1,3]  | [0,2]       | [1,3]  |
| Sand      | [0,1]  | [1,2]  | [2,4]       | [2,5]  |
| Forest    | [4,7]  | [0,2]  | [0,2]       | [1,3]  |
| Swamp     | [3,6]  | [0,1]  | [0,1]       | [2,4]  |
| Rock      | [0,1]  | [4,7]  | [0,2]       | [0,2]  |
| Mountain  | [0,1]  | [6,10] | **[1,3]** ← | [0,1]  |
| Water     | [0,0]  | [0,0]  | [0,1]       | [3,6]  |
| Oil       | [0,0]  | [1,2]  | [0,1]       | [7,10] |
| Ice       | [0,1]  | [0,2]  | [3,6]       | [0,1]  |

---

## 5. Tile Distribution Weights Per Biome

### 5.1 Recommended Change

**Jungle — shift 2% from Forest tiles to Oil tiles:**

| Jungle Tile | Current | Proposed | Rationale |
|-------------|---------|----------|-----------|
| Forest      | 0.60    | **0.58** | Slight reduction to make room for Oil |
| Oil         | 0.02    | **0.04** | Jungle wetlands/swamp naturally contain oil seeps |

This reinforces Jungle's identity as the "Carbon + Oil" spawn biome.

### 5.2 Recommended Tile Distribution Table (Final)

| Biome     | Plains | Sand | Forest   | Swamp | Rock | Mountain | Water | Oil      | Ice  |
|-----------|--------|------|----------|-------|------|----------|-------|----------|------|
| Ocean     | 0.05   | 0.00 | 0.01     | 0.00  | 0.00 | 0.00     | 0.90  | 0.03     | 0.01 |
| Desert    | 0.10   | 0.70 | 0.01     | 0.00  | 0.10 | 0.05     | 0.01  | 0.03     | 0.00 |
| Jungle    | 0.10   | 0.00 | **0.58** | 0.15  | 0.01 | 0.01     | 0.10  | **0.04** | 0.01 |
| Forest    | 0.20   | 0.00 | 0.60     | 0.05  | 0.05 | 0.02     | 0.05  | 0.02     | 0.01 |
| Temperate | 0.40   | 0.05 | 0.30     | 0.05  | 0.10 | 0.05     | 0.03  | 0.01     | 0.01 |
| Tundra    | 0.10   | 0.00 | 0.05     | 0.00  | 0.10 | 0.05     | 0.05  | 0.00     | 0.65 |
| Mountain  | 0.05   | 0.00 | 0.01     | 0.00  | 0.30 | 0.60     | 0.01  | 0.01     | 0.02 |

---

## 6. Biome Multipliers & Effective Output

### 6.1 Pre-Multiplier Average Base Rates

Computed from tile distribution × midpoint base rate (using revised Mountain Crystal [1,3] and Jungle tile weights):

| Biome     | Carbon | Iron | Crystal | Oil  |
|-----------|--------|------|---------|------|
| Ocean     | 0.21   | 0.16 | 0.56    | 4.38 |
| Desert    | 0.78   | 2.22 | 2.43    | 3.04 |
| Jungle    | 4.18   | 1.06 | 0.90    | 2.62 |
| Forest    | 4.17   | 1.50 | 1.00    | 2.21 |
| Temperate | 3.18   | 2.18 | 1.14    | 2.08 |
| Tundra    | 0.93   | 1.70 | 3.28    | 0.88 |
| Mountain  | 0.67   | 6.59 | 1.66    | 0.84 |

### 6.2 Current Multipliers

| Biome     | Carbon | Iron | Crystal | Oil  | Cap × | Σm   |
|-----------|--------|------|---------|------|-------|------|
| Ocean     | 0.50   | 0.50 | 0.50    | 1.10 | 1.00  | 2.60 |
| Desert    | 0.70   | 0.80 | 1.20    | 1.25 | 1.05  | 3.95 |
| Jungle    | 1.10   | 0.80 | 0.80    | 1.05 | 1.10  | 3.75 |
| Forest    | 1.10   | 1.05 | 0.90    | 0.90 | 1.15  | 3.95 |
| Temperate | 1.00   | 1.00 | 1.00    | 1.00 | 1.00  | 4.00 |
| Tundra    | 0.50   | 0.90 | 1.40    | 0.80 | 0.95  | 3.60 |
| Mountain  | 0.40   | 1.35 | 1.10    | 0.60 | 1.05  | 3.45 |

### 6.3 Why Σm Is Broken for Spawn Eligibility

The Σm spawn eligibility test treats all four resources as equally valuable. Under the target worth ratios (C=1, Fe=2, Cr=3, O=1.5), a biome producing mostly Crystal at Σm=4.0 is structurally far richer than one producing mostly Carbon at Σm=4.0. The correct test is **worth-weighted effective output (WWEO):**

$$\text{WWEO} = \sum_r \text{eff}_r \times v_r$$

where $\text{eff}_r$ = biome pre-multiplier average × biome multiplier for resource $r$, and $v_r$ is the target worth.

### 6.4 WWEO With Current Multipliers

| Biome     | C eff | Fe eff | Cr eff | O eff | WWEO  | vs Temperate |
|-----------|-------|--------|--------|-------|-------|-------------|
| Temperate | 3.18  | 2.18   | 1.14   | 2.08  | **14.06** | — |
| Forest    | 4.58  | 1.58   | 0.90   | 1.99  | **13.40** | −4.7% |
| Jungle    | 4.60  | 0.85   | 0.72   | 2.75  | **12.47** | −11.3% |
| Desert    | 0.55  | 1.78   | 2.92   | 3.80  | **18.50** | +31.6% |
| Tundra    | 0.47  | 1.53   | 4.59   | 0.70  | **18.23** | +29.7% |
| Mountain  | 0.27  | 8.90   | 1.83   | 0.50  | **24.30** | +72.8% |
| Ocean     | 0.11  | 0.08   | 0.28   | 4.82  | **8.04**  | −42.8% |

### 6.5 Problems Found

1. **Desert is Rich, not Moderate.** WWEO +31.6% above Temperate. Crystal effective output (2.92/tick) at worth ×3 dominates. The old Σm metric (3.95) missed this entirely. **Desert must be removed from the spawn pool.**

2. **Jungle is borderline Poor** at −11.3% below Temperate. Weak Iron (0.85) and Crystal (0.72) drag it down. Needs an uplift to remain spawn-eligible.

3. **Forest and Temperate** are solid Moderate biomes within 5% of each other.

4. **Tundra, Mountain, Ocean** are correctly classified as non-spawn under either metric.

### 6.6 Recommended Multiplier Changes

| Biome  | Resource | Current | Proposed | Rationale |
|--------|----------|---------|----------|-----------|
| Jungle | Iron     | 0.80    | **0.85** | Small uplift for minimum early-game industrial viability |
| Jungle | Oil      | 1.05    | **1.20** | Thematically fits (swamp/wetland oil). Largest single WWEO contribution. |

### 6.7 Recommended Biome Multiplier Table (Final)

| Biome     | Carbon | Iron     | Crystal | Oil      | Cap × |
|-----------|--------|----------|---------|----------|-------|
| Ocean     | 0.50   | 0.50     | 0.50    | 1.10     | 1.00  |
| Desert    | 0.70   | 0.80     | 1.20    | 1.25     | 1.05  |
| Jungle    | 1.10   | **0.85** | 0.80    | **1.20** | 1.10  |
| Forest    | 1.10   | 1.05     | 0.90    | 0.90     | 1.15  |
| Temperate | 1.00   | 1.00     | 1.00    | 1.00     | 1.00  |
| Tundra    | 0.50   | 0.90     | 1.40    | 0.80     | 0.95  |
| Mountain  | 0.40   | 1.35     | 1.10    | 0.60     | 1.05  |

### 6.8 Post-Change WWEO

Jungle with revised multipliers and tile weights:

| Resource | Pre-Mult | × Mult | Eff  |
|----------|----------|--------|------|
| Carbon   | 4.18     | 1.10   | 4.60 |
| Iron     | 1.06     | 0.85   | 0.90 |
| Crystal  | 0.90     | 0.80   | 0.72 |
| Oil      | 2.62     | 1.20   | 3.14 |

Jungle WWEO = 4.60 + 1.80 + 2.16 + 4.72 = **13.28** (−5.5% vs Temperate) ✓

**Final WWEO Table:**

| Biome     | WWEO  | vs Temperate | Classification   |
|-----------|-------|-------------|------------------|
| Temperate | 14.06 | —           | ✅ Moderate       |
| Forest    | 13.40 | −4.7%       | ✅ Moderate       |
| Jungle    | 13.28 | −5.5%       | ✅ Moderate       |
| Desert    | 18.50 | +31.6%      | ❌ Rich           |
| Tundra    | 18.23 | +29.7%      | ❌ Not eligible   |
| Mountain  | 24.30 | +72.8%      | ❌ Not eligible   |
| Ocean     | 8.04  | −42.8%      | ❌ Poor           |

Three spawn-eligible biomes (Temperate, Forest, Jungle), all within 5.5% of each other. Clean, fair, and each with a distinct strategic identity.

---

## 7. Spawn Eligibility Rule

### 7.1 Replace Σm with WWEO

The current Σm-based rule in resource-generation.md and map-generation.md should be replaced:

**Current (incorrect):**
> Σm > 4.25 → Rich; 3.75 ≤ Σm ≤ 4.25 → Moderate; Σm < 3.75 → Poor

**Proposed:**

$$\text{WWEO} = \sum_r \text{eff}_r \times v_r$$

| Tier     | WWEO Range | Spawn-Eligible | Description |
|----------|-----------|----------------|-------------|
| Rich     | > 15.5    | ❌ No           | Structural advantage from high-value resources |
| Moderate | 12.0–15.5 | ✅ Yes          | Balanced enough for fair starts |
| Poor     | < 12.0    | ❌ No           | Structural disadvantage |

Thresholds are centered on Temperate (WWEO = 14.06), with roughly ±10% tolerance for the Moderate band.

> **Note:** The target worth constants ($v_C=1, v_{Fe}=2, v_{Cr}=3, v_O=1.5$) are design-time inputs to this formula and must be documented alongside the rule. They are not derived at runtime.

### 7.2 Spawn Biome Strategic Identities

| Spawn Biome | Strengths | Weaknesses | Early Production Lean |
|-------------|-----------|------------|----------------------|
| Temperate | Balanced — no crippling weakness | No major spike | Can pursue any Tier 1 |
| Forest | Carbon (4.58), decent Iron (1.58) | Crystal (0.90), Oil moderate (1.99) | Steel (has Iron + Carbon) |
| Jungle | Carbon (4.60), Oil (3.14) | Iron (0.90), Crystal (0.72) | Fuel (has Oil + Carbon) |

All three share Carbon abundance and Crystal scarcity. This creates a universal early-game dynamic: Carbon-based activities are easy, Crystal-dependent activities require expansion. Within that frame, Forest leans toward Steel production and Jungle leans toward Fuel production.

---

## 8. Spawn-Supply Worth Verification

### 8.1 Weighted Spawn Average

Using approximate biome prevalence in spawn latitude bands (normalized): Temperate 0.38, Forest 0.34, Jungle 0.28.

| Resource | Weighted Spawn Avg | Implied Worth (C=1) | Target | Direction |
|----------|--------------------|---------------------|--------|-----------|
| Carbon   | 4.05               | 1.00                | 1.0    | ✅ On target |
| Oil      | 2.35               | 1.72                | 1.5    | ⚠️ Slightly over-scarce |
| Iron     | 1.62               | 2.50                | 2.0    | ⚠️ Slightly over-scarce |
| Crystal  | 0.95               | 4.26                | 3.0    | ⚠️ Over-scarce at spawn |

### 8.2 Why This Deviation Is Acceptable

Spawn-only worth exceeds target for all non-Carbon resources. This is expected and desirable:

1. **Spawn supply is tighter than mid-game supply by design.** Players expand into Desert (Crystal+Oil), Mountain (Iron), and Tundra (Crystal). The target worth ratios represent mid-game equilibrium, not the opening minutes. Early Crystal scarcity is what drives territorial expansion.

2. **The yield model amplifies expansion value.** Because refining conserves total worth, a player who secures Crystal territory and refines it into Electronics or Plasma converts high-worth Crystal into volume of processed product. The refining chain rewards expansion naturally.

If spawn-supply implied worth exactly matched the targets, there would be no expansion pressure — the starting position would already be in equilibrium. The deviation is the engine that drives the game.

---

## 9. Raw Resource Substitution — Analysis & Recommendation

### 9.1 The Question

Should a player be allowed to build a unit or structure whose cost is expressed in refined resources (e.g. Steel) by paying directly in raw resources (e.g. Iron + Carbon) at a premium — for example a 1.5× raw cost markup?

Example: A tank costs 6 Steel. Without Steel refining capability, the player could instead pay 9 raw resource units (1.5× the Steel recipe's raw equivalent) to build it directly.

### 9.2 Case For Substitution

| Argument | Weight |
|----------|--------|
| **Accessibility.** 9 distinct resources is complex. New players may feel locked out of units until they build specific refineries. Substitution provides a fallback path. | Moderate |
| **Specialization and trade.** Some players may specialize in refining and sell refined products. A substitution premium creates a clear price signal for refined vs raw goods, encouraging this specialization. | Moderate |
| **Flexibility.** Players in early-game or emergency situations can still build needed units without the full production chain. Prevents hard locks. | Moderate |
| **Market emergence.** A known substitution premium (1.5×) establishes a price ceiling for refined goods on the market. Refined goods should trade at or below 1.5× their raw input cost, otherwise buyers simply substitute. This creates natural market dynamics. | High |

### 9.3 Case Against Substitution

| Argument | Weight |
|----------|--------|
| **Natural tech tree.** Without substitution, the refining chain creates organic progression: raw-only → build foundry → Steel units → build factory → Electronics units → build advanced factory → Composite/Plasma units. Each building investment unlocks new capabilities. With substitution, progression is just "things get cheaper," which feels less meaningful. | **High** |
| **Worth should be emergent, not mechanical.** Hard-coding a 1.5× premium bakes resource worth into game rules. The design intent (§2) is for worth to emerge from supply/demand. Substitution locks a specific exchange rate into the system, reducing economic dynamism. | **High** |
| **Refineries become strategically important.** Without substitution, an Electronics factory is a critical asset — destroy it and the enemy loses access to Electronics-gated units entirely. With substitution, destroying a factory only makes production 33% more expensive. The strategic stakes are fundamentally different. | **High** |
| **Trade emerges naturally from scarcity.** A player without an Electronics factory can trade surplus Carbon or Oil or Crystal for Electronics with a player who has them. This creates richer player interaction than a flat premium substitute. Trading refined goods is a natural gameplay mode that substitution undermines. | **High** |
| **Consistency with design philosophy.** The game's distributed-storage model, physical logistics, and per-base upkeep (resources.md, upkeep.md) are all designed to make resource management a core strategic layer. Adding a substitution shortcut works against this design pillar. | **High** |
| **The complexity concern is addressable through UI.** Good resource chain visualization, production queue management, and storage overviews make 9 resources manageable. The solution to complexity is UI clarity, not mechanical shortcuts. | Moderate |

### 9.4 The 1.5× Premium Problem

A 1.5× substitution premium has unintended mechanical consequences:

**It caps the worth-weighted value of refined resources.** If 1 Steel can always be substituted by 1.5× raw equivalents (0.5C + 1Fe = 2.5 worth), then Steel's market value can never exceed 2.5 worth-units — even though its intrinsic worth is 1.667. The premium acts as a hard ceiling on market pricing.

This is particularly problematic for Electronics. Electronics' raw equivalent at 1.5× premium would cost (0.6Fe + 0.9Cr) × 1.5 = 0.9Fe + 1.35Cr per unit = 1.8 + 4.05 = 5.85 worth. Compare to its intrinsic worth of 2.6. The 1.5× premium on Electronics is more than double the resource's actual worth — meaning substitution would be extremely punitive for Electronics specifically, while being relatively cheap for Steel and Fuel. This inconsistency creates balance distortion.

### 9.5 Recommendation: No Substitution

**Do not allow raw resource substitution for refined/advanced resource costs.**

The arguments against substitution are systematically stronger:

1. **The natural tech tree is the single strongest argument.** Access to refining creates a progression curve that feels earned — players invest in infrastructure and unlock new capabilities. This is more engaging than "the same thing but cheaper."

2. **Strategic depth from scarcity.** Without substitution, a player lacking Electronics production must trade, expand, or do without Electronics. This creates meaningful strategic decisions. With substitution, this just means "things cost 1.5× more," which is a pricing difference, not a strategic one.

3. **Refinery targeting.** Refineries as critical infrastructure adds a layer of strategic gameplay: protecting your factories, raiding enemy factories, and rebuilding after losses all become important. This layer disappears with substitution.

4. **Emergent economy.** The resource system is designed for worth to emerge from scarcity and demand, not from a fixed substitution ratio. Substitution undercuts this by imposing an artificial price ceiling.

### 9.6 Addressing the Concerns

The legitimate concerns raised in the case for substitution should be addressed through other mechanisms:

| Concern | Solution Without Substitution |
|---------|------------------------------|
| Early-game accessibility | Tier 1 units (infantry, scouts) should cost only raw resources. Players always have something to build. Refined resources gate Tier 2+ units, which players unlock through infrastructure investment. |
| Complexity of 9 resources | UI design — resource chain displays, production dashboards, and alerts for supply chain bottlenecks. The game already requires complex logistics (resources.md); resource management UI is a natural complement. |
| Getting "stuck" | Trading. The market system (public, private, direct transfer) exists precisely for this scenario. A player with surplus Carbon trades for Electronics with a player who has surplus Crystal. This creates richer gameplay than a substitution premium. |
| Specialization and trade | Specialization is *stronger* without substitution. A player with Crystal territory AND Electronics factories can sell Electronics at market rates. Without substitution, buyers have no alternative — they must buy or build their own facility. This makes the refiner's specialization genuinely valuable. |

### 9.7 Unit Cost Tier Framework

With no substitution, unit costs should follow a tiered model matching the tech tree:

| Unit Tier | Resource Tier Used | Example |
|-----------|--------------------|---------|
| T1 — Basic units | Raw resources only (Carbon, Iron, Oil) | Infantry, scout, basic structures |
| T2 — Standard units | Raw + Refined (Steel, Fuel, Electronics) | Tanks, aircraft, production buildings |
| T3 — Advanced units | Refined + Advanced (Composite, Plasma) | Heavy armor, energy weapons, research labs |

This creates clear progression gates:
- **Start:** Build T1 units from spawn-available raw resources
- **Mid-game:** Build refineries → access T2 units
- **Late-game:** Build advanced factories → access T3 units

Each tier requires infrastructure investment, creating a natural tech tree without artificial research locks.

---

## 10. Summary of All Recommended Changes

### 10.1 Changes to resource-generation.md

| Item | Current | Recommended |
|------|---------|-------------|
| Mountain Crystal base range | [2,4] | **[1,3]** |
| Jungle Iron multiplier | 0.80 | **0.85** |
| Jungle Oil multiplier | 1.05 | **1.20** |
| Desert tier classification | Moderate | **Rich** |
| Spawn eligibility rule | Σm threshold | **WWEO threshold** |
| Effective output table | Unweighted totals | **WWEO-weighted, refined per §6** |

### 10.2 Changes to map-generation.md

| Item | Current | Recommended |
|------|---------|-------------|
| Jungle tile type: Forest | 0.60 | **0.58** |
| Jungle tile type: Oil | 0.02 | **0.04** |
| Spawn Point Assignment | Pre-selected before game | **On-demand when player joins** |
| Spawn Biome Eligibility Rule | Σm-based | **WWEO-based** |

### 10.3 New Design Constants

| Item | Value |
|------|-------|
| Target worth constants | $v_C=1,\ v_{Fe}=2,\ v_{Cr}=3,\ v_O=1.5$ |
| WWEO Rich threshold | > 15.5 |
| WWEO Moderate band | 12.0 – 15.5 |
| WWEO Poor threshold | < 12.0 |
| Eligible spawn biomes | Temperate, Forest, Jungle |

### 10.4 Processing Recipes (New)

```
╔══════════════════════════════════════════════════════════════════════╗
║  TIER 2 — REFINED RESOURCES (volume-conserving yield)              ║
║                                                                      ║
║  3   Steel       = 1 Carbon + 2 Iron            (1.667 worth/unit) ║
║  5   Electronics = 2 Iron   + 3 Crystal          (2.600 worth/unit) ║
║  2.5 Fuel        = 1 Carbon + 1.5 Oil            (1.300 worth/unit) ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  TIER 3 — ADVANCED RESOURCES                                       ║
║                                                                      ║
║  8   Composite = 3 Steel + 5 Electronics          (2.250 worth/unit)║
║   └─ Raw per batch: 1 Carbon + 4 Iron + 3 Crystal                  ║
║                                                                      ║
║  5.5 Plasma    = 2.5 Fuel + 3 Crystal             (2.227 worth/unit)║
║   └─ Raw per batch: 1 Carbon + 1.5 Oil + 3 Crystal                 ║
║                                                                      ║
║  Per-unit parity: Composite / Plasma = 1.01 : 1                    ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 10.5 Design Decisions (New)

| Decision | Status |
|----------|--------|
| Raw resource substitution for refined costs | **No** — not allowed (see §9) |
| Composite vs Plasma per-unit worth | **Near-parity** — strategic choice is about supply chain, not inherent worth |
| Crystal as cross-path bottleneck | **Confirmed** — 6 Crystal per combined Tier 2 cycle drives expansion |
| Unit cost framework | **Tiered** — T1 raw only, T2 refined, T3 advanced (see §9.7) |

---

## 11. Volume Conservation vs. Value Escalation

### 11.1 The Question

The current processing model conserves volume: yield = total input units. This means 1C + 2Fe (3 input units) → 3 Steel (3 output units). Per-unit worth of the output is the weighted average of its inputs' per-unit worths.

Is this volume conservation actually required? Or should processing produce **fewer** output units than input units, concentrating value into the processed product?

### 11.2 The Problem: Raw Crystal Exceeds Processed Worth

Under volume conservation, the per-unit worth hierarchy is:

```
Carbon  1.000       ← Raw
Fuel    1.300       ← Refined (contains Carbon + Oil)
Oil     1.500       ← Raw
Steel   1.667       ← Refined (contains Carbon + Iron)
Iron    2.000       ← Raw
Plasma  2.227       ← ADVANCED
Composite 2.250     ← ADVANCED
Electronics 2.600   ← Refined (contains Iron + Crystal)
Crystal 3.000       ← RAW  ← ⚠️ Most valuable resource in the game
```

**Crystal (a raw, unprocessed resource) is worth more per unit than every refined and advanced product in the game.** This is counterintuitive and undermines the design:

| Issue | Why It Matters |
|-------|---------------|
| **No processing incentive.** If Crystal is worth 3.0/unit and Electronics only 2.6/unit, why convert Crystal into Electronics? You're *destroying* per-unit value. The only reason is that Electronics is needed for recipes — not that it's inherently more valuable. | Processing should feel like creation of value, not dilution. |
| **Inverted progression feel.** Players expect late-game resources to be inherently more precious than early-game ones. An advanced resource (Composite) worth 2.25 vs a raw material (Crystal) worth 3.0 feels wrong. | Progression should feel like ascending worth, not diminishing returns. |
| **Market confusion.** On a trade market, 1 Crystal should not logically buy more than 1 Electronics — but under volume conservation, it can (3.0 vs 2.6). | Market pricing should reflect processing investment. |
| **Infrastructure investment is uncompensated.** Building a refinery, paying its upkeep, and waiting for processing time are real costs. Under volume conservation, those costs produce no per-unit value increase. | Players should be rewarded for infrastructure investment. |

### 11.3 The Root Cause

Volume conservation sets yield = input_sum. The per-unit worth of the output is therefore a *weighted average* of input worths. Any average will always be *between* the minimum and maximum input worths — so a product containing a high-worth input (Crystal) will always have lower per-unit worth than that input alone.

This is a mathematical inevitability of volume conservation, not a tuning problem. No adjustment to input ratios can fix it while preserving yield = input_sum.

### 11.4 The Fix: Processing Should Concentrate Value

If yield < input_sum, then processing produces fewer but more valuable units. Each processing step concentrates value — the infrastructure, time, and energy invested in processing are reflected in the higher per-unit worth of the output.

This is realistic: 3 tons of iron ore and carbon do not produce 3 tons of steel. Real refining has thermodynamic losses, waste material, and energy costs. The output is less in volume but greater in utility.

**Gameplay benefits of yield < input_sum:**

| Benefit | Mechanism |
|---------|-----------|
| Processing is rewarded | Each tier produces higher per-unit worth → refineries are worth building |
| Clear progression hierarchy | Raw < Refined < Advanced in per-unit worth, always |
| Storage concentration | Processed goods store more value per slot → natural incentive to refine before storing |
| Market pricing is intuitive | Higher-tier products always command higher prices per unit |
| Refinery specialization pays off | A player who refines and sells processed goods earns more per unit than selling raw |

### 11.5 Recommended Yields

Keep the **input ratios exactly as specified.** Only reduce the output yield per recipe. The recommended yields produce clean integer batches and ensure each product is worth strictly more than its most expensive input.

#### Tier 2 — Revised Yields

| Recipe | Inputs | Input Units | Current Yield | Recommended Yield | Integer Batch |
|--------|--------|------------|---------------|-------------------|---------------|
| Steel | 1C + 2Fe | 3 | 3 | **2** | 1C + 2Fe → 2 Steel |
| Electronics | 2Fe + 3Cr | 5 | 5 | **3** | 2Fe + 3Cr → 3 Electronics |
| Fuel | 1C + 1.5O | 2.5 | 2.5 | **1.5** | 2C + 3O → 3 Fuel |

#### Tier 3 — Revised Yields

| Recipe | Inputs | Input Units | Current Yield | Recommended Yield | Integer Batch |
|--------|--------|------------|---------------|-------------------|---------------|
| Composite | 3 Steel + 5 Electronics | 8 | 8 | **5** | 3S + 5E → 5 Composite |
| Plasma | 2.5 Fuel + 3 Crystal | 5.5 | 5.5 | **3** | 5 Fuel + 6 Crystal → 6 Plasma |

### 11.6 New Per-Unit Worth Hierarchy

$$W_{\text{Steel}} = \frac{1 \times 1 + 2 \times 2}{2} = \frac{5}{2} = \mathbf{2.50}$$

$$W_{\text{Electronics}} = \frac{2 \times 2 + 3 \times 3}{3} = \frac{13}{3} = \mathbf{4.33}$$

$$W_{\text{Fuel}} = \frac{2 \times 1 + 3 \times 1.5}{3} = \frac{6.5}{3} = \mathbf{2.17}$$

$$W_{\text{Composite}} = \frac{3 \times 2.50 + 5 \times 4.33}{5} = \frac{29.17}{5} = \mathbf{5.83}$$

$$W_{\text{Plasma}} = \frac{5 \times 2.17 + 6 \times 3.0}{6} = \frac{28.83}{6} = \mathbf{4.81}$$

**New hierarchy (ascending):**

```
 1. Carbon        1.000   Raw
 2. Oil           1.500   Raw
 3. Iron          2.000   Raw
 4. Fuel          2.167   Refined   ← above Oil ✓
 5. Steel         2.500   Refined   ← above Iron ✓
 6. Crystal       3.000   Raw
 7. Electronics   4.333   Refined   ← above Crystal ✓
 8. Plasma        4.806   Advanced  ← above Electronics ✓
 9. Composite     5.833   Advanced  ← above Plasma ✓
```

Every processed resource is worth strictly more than all of its raw inputs. Every tier is worth more than the tier below. **Composite is now the most valuable resource in the game** — not Crystal.

### 11.7 Property Comparison

| Property | Volume Conservation (yield = input) | Value Escalation (yield < input) |
|----------|--------------------------------------|-----------------------------------|
| Per-unit worth direction | **Downward** — processing dilutes | **Upward** — processing concentrates ✓ |
| Crystal position | Most valuable overall | Most valuable *raw* (below all refined/advanced) ✓ |
| Storage efficiency | Neutral — same volume in, same out | **Improved** — processed goods denser in value ✓ |
| Composite:Plasma ratio | 2.250 / 2.227 = 1.01:1 | 5.833 / 4.806 = 1.21:1 — modest, healthy ✓ |
| Total worth conserved? | Yes — input worth = output worth | Yes — still conserved, concentrated into fewer units ✓ |
| Intuitive progression? | No — Crystal raw beats all processed | Yes — each tier is strictly higher ✓ |

### 11.8 Impact on Biome Analysis

The biome WWEO analysis (§6) is unaffected. WWEO is computed from raw resource generation rates and raw worth constants — it does not depend on processing yields. Whether tiles produce 3 Steel or 2 Steel from the same inputs does not change how many raw resources the tiles generate.

The yield change affects *demand-side* economics (how many raw resources are consumed per unit of processed product) but not *supply-side* balancing (how many raw resources tiles produce).

### 11.9 Revised Recipe Card

```
╔══════════════════════════════════════════════════════════════════════╗
║  TIER 2 — REFINED RESOURCES (value-concentrating yield)             ║
║                                                                      ║
║  2 Steel       = 1 Carbon + 2 Iron              (2.500 worth/unit) ║
║  3 Electronics = 2 Iron   + 3 Crystal            (4.333 worth/unit) ║
║  3 Fuel        = 2 Carbon + 3 Oil    [int batch]  (2.167 worth/unit) ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  TIER 3 — ADVANCED RESOURCES                                        ║
║                                                                      ║
║  5 Composite = 3 Steel + 5 Electronics            (5.833 worth/unit) ║
║   └─ Raw per batch: 1 Carbon + 4 Iron + 3 Crystal                   ║
║                                                                      ║
║  6 Plasma    = 5 Fuel  + 6 Crystal   [int batch]  (4.806 worth/unit) ║
║   └─ Raw per batch: 10/3 Carbon + 5 Oil + 6 Crystal                 ║
║                                                                      ║
║  Composite / Plasma per-unit ratio = 1.21 : 1                       ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 11.10 Recommendation

**Adopt value-concentrating yields.** Volume conservation was elegant for storage accounting but produces a broken per-unit worth hierarchy. The revised yields:

- Maintain the exact input ratios already designed
- Use clean integer batches for all recipes
- Create an intuitive ascending worth hierarchy (Raw < Refined < Advanced)
- Reward infrastructure investment through per-unit value increase
- Keep Composite:Plasma ratio at a healthy 1.21:1

---

## 12. Market Mechanics — Analysis & Recommendation

### 12.1 The Design Challenge

WargameX has two economic rails (see resources.md):

- **Physical resources** — Stored at bases, moved by forces, subject to interception. Logistics is a core design pillar.
- **Credits** — Global, instant settlement. Used for upkeep, fees, and financial transactions.

A market system must bridge these rails. The core tensions:

| Tension | Pull A | Pull B |
|---------|--------|--------|
| Liquidity vs. Physical Realism | Players need a way to efficiently find counterparties and set prices | Resources should move physically, not teleport |
| Trade Safety vs. Piracy Gameplay | Traders need enough safety to make trading viable | Pirates/raiders intercepting trade convoys is a core tactical layer |
| Convenience vs. Strategic Depth | Quick, frictionless market access encourages economic activity | Friction (logistics, risk, distance) creates meaningful strategic decisions |

### 12.2 Trade Channels

Three distinct channels serve different purposes. The question is how each should work.

#### Channel 1: Direct Transfer

| Attribute | Value |
|-----------|-------|
| Goods traded | Resources and Units |
| Currency | None — unilateral gift/supply |
| Delivery | Physical — sender's forces carry cargo across the map |
| Interception risk | **Full** — sender's convoy is a normal unit stack, attackable |
| Discovery cost | None — sender knows destination |
| Use case | Inter-base logistics, alliance resupply, tribute |

This is the simplest channel. No market needed. A player orders their units to pick up resources and walk them somewhere. Straightforward, already implied by the physics of the game.

**No design issues here.** This should always exist.

#### Channel 2: Private Trade

| Attribute | Value |
|-----------|-------|
| Goods traded | Resources and Units |
| Currency | Negotiated — barter (resource-for-resource), credits, or mixed |
| Delivery | Physical — agreed between parties (buyer collects, seller delivers, or meet halfway) |
| Interception risk | **Full** — delivery convoy is a normal unit stack |
| Discovery cost | High — must find a trading partner through diplomacy |
| Use case | Bilateral deals, bulk trades, unit sales, alliances |

Private trade is the relationship-driven channel. Two players negotiate terms, agree on delivery, and execute. Delivery is physical and risky.

**Key property:** Private trade has no intermediary fees. The full value of the trade goes to the parties involved. However, both parties bear delivery risk and must trust either each other or use an escrow mechanism (credit-based, with payment on delivery confirmation).

**No fundamental design issues.** This should always exist alongside direct transfer.

#### Channel 3: Public Market

This is where the hard design decisions live. Multiple models are possible.

### 12.3 Public Market — Option Analysis

#### Option A: Full Physical Market

| Attribute | Value |
|-----------|-------|
| Sell | List resources at a price. Resources held in escrow at seller's base. |
| Buy | Pay credits. Must send forces to seller's base to physically collect resources. |
| Delivery | Physical — buyer's forces carry purchased goods home |
| Interception | **Full risk** on the collection run |
| Fee | Market listing fee (credit sink) |

**Pros:**
- Fully consistent with physical logistics design
- Piracy on trade routes is preserved
- No teleportation of resources

**Cons:**
- **Reveals seller base location to all buyers** — major strategic exposure
- Buyer must know where to go, commit military forces to collection, and defend the return trip
- Very high friction — barely better than private trade in practice
- Market may get no liquidity because few players will expose their bases

**Verdict:** Too much friction. The market adds almost nothing over private trade if the buyer must physically travel to the seller anyway.

#### Option B: Neutral Convoy Delivery (Non-Interceptable)

| Attribute | Value |
|-----------|-------|
| Sell | List resources at a price. Resources consumed instantly, credits received. |
| Buy | Pay credits + distance-proportional shipping fee. Neutral convoy delivers after travel-time delay. |
| Delivery | Neutral NPC convoy — visible on map but not attackable |
| Interception | **None** |
| Fee | Market fee + distance-based shipping cost |

**Pros:**
- Clean, convenient, liquid market
- Distance-based fee creates natural trade zones (nearby trades are cheap)
- No base location exposure to buyers
- Neutral convoys add worldbuilding flavor

**Cons:**
- **Completely bypasses physical logistics** — resources effectively teleport (at cost)
- **Eliminates piracy on market trades** — piracy only applies to private/direct trades
- Creates a safe resource pipeline that undermines blockade strategy
- A player under siege can still buy resources via market if they have credits
- Distance fee partially compensates but doesn't restore the tactical layer

**Verdict:** Too safe. Undermines the physical logistics design pillar. If the market is risk-free, private trade and piracy become niche mechanics instead of core gameplay.

#### Option C: Credit-Mediated Global Exchange (Recommended for Resources)

| Attribute | Value |
|-----------|-------|
| Sell | Player sells X of resource R at price P credits/unit. Resources are **consumed** instantly at the seller's base. Credits are received. |
| Buy | Player buys X of resource R at price P credits/unit. Credits are consumed. Resources are **created** at the buyer's base after a fixed delivery delay. |
| Delivery | Abstracted — no physical convoy. A global market delay (e.g. 30–60 ticks, configurable) represents background logistics. |
| Interception | **None on market transactions** |
| Fee | **Market spread + percentage fee** (credit sink). Typical: 10–15% of transaction value in credits. |

**Pros:**
- Liquid, accessible market — any player can participate
- No base location exposure
- No safe physical pipeline (nothing moves on the map)
- Price discovery through supply/demand of buy/sell orders
- The market fee + spread makes market prices worse than direct trade → private/physical trade remains the more profitable option
- Simple to implement — no convoy AI, no pathing, no interception logic

**Cons:**
- Resources are abstractly created/consumed — not fully physical
- Undermines logistics for routine commodity trades
- No piracy opportunity on market trades

**Why this is acceptable despite not being fully physical:**

The market fee (10–15%) is the critical balancing lever. It means market prices are systematically worse than direct trade:

| Trade Channel | Example: Selling 100 Crystal | Net Credits to Seller |
|---------------|------------------------------|----------------------|
| Private trade (barter) | Trade 100 Crystal for 200 Iron directly | Full value — no fee |
| Private trade (credits) | Sell for agreed price, e.g. 300 credits | 300 credits — no fee |
| Public market | Sell at market rate, e.g. 300 credits minus 10% fee | 270 credits |
| Public market buyer | Buy at market rate, e.g. 300 credits plus 10% fee | Pays 330 credits |

The **20–30% round-trip cost** (seller fee + buyer fee) is the market's "convenience tax." It guarantees that:

- **Private trade is always more profitable** when feasible → physical logistics stays relevant
- **The market serves as a fallback**, not the primary trade channel → liquidity exists but doesn't dominate
- **Piracy affects the more profitable channel** → pirates target private trade convoys, which carry higher margins, creating a meaningful risk/reward calculation

### 12.4 Should Units Be Tradeable on the Public Market?

| Argument | For Units on Market | Against Units on Market |
|----------|--------------------|-----------------------|
| **Instant reinforcement** | — | A player could buy a tank army with credits and have it appear at their base instantly. This completely bypasses deployment logistics and breaks tactical gameplay. |
| **Strategic sensitivity** | — | Units represent combat power. Instantaneous transfer of combat power across the map is strategically broken, even with a delay. |
| **Balance** | Players could specialize as unit manufacturers and sell | A wealthy player could buy their way out of a losing military position. Credits = army is a bad loop. |
| **Logistics** | — | The game's core loop requires physical unit movement. Market unit delivery bypasses this entirely. |
| **Narrative** | Hard to explain — who "ships" a tank battalion? | Resources are commodities that can be abstractly exchanged. Military units are not. |

**Recommendation: Units may NOT be traded on the public market.** Units can only change hands through:

- **Private trade** — physical delivery, full interception risk
- **Combat** — capture mechanics (if implemented)
- **Direct transfer** — physical delivery, full interception risk

This preserves the tactical integrity of unit deployment while allowing the public market to handle commodity resource trading.

### 12.5 Should the Public Market Allow Resource-for-Resource Trades?

The public market is credit-mediated. Can a player trade Crystal directly for Iron on the market?

Not directly — but the credit layer achieves the same result in two transactions:

1. Player sells 100 Crystal at market rate → receives credits (minus fee)
2. Player buys Iron with credits → pays credits (plus fee)

This two-step process has a natural friction (the double fee) that makes direct private barter more attractive for players who can arrange it. This friction is a feature, not a bug — it drives players toward the richer social/logistics channel of private trade for frequent, high-value exchanges, while the market catches everything else.

**Recommendation: Public market is credits-only.** No direct barter on the market. This keeps the market simple, liquid, and doesn't undermine private barter.

### 12.6 Private Trade vs. Public Market — Incentive Balance

With the recommended design, each channel has clear strengths:

| Factor | Private Trade | Public Market |
|--------|--------------|---------------|
| Price efficiency | **Best** — no fees, negotiated | Worst — 10–15% fee each side |
| Counterparty discovery | Hard — must find partner | **Easy** — open order book |
| Barter (resource-for-resource) | **Yes** — direct exchange | No — must go through credits |
| Unit trading | **Yes** — physical delivery | No — resources only |
| Delivery risk | **Full** — interceptable convoy | None — abstracted |
| Delivery speed | Variable — depends on distance, escorts, route | Fixed delay — global delivery timer |
| Base location exposure | Trade-partner-only | None |
| Relationship building | **Strong** — creates alliances | Weak — anonymous |

The table reveals natural player segmentation:

- **Allied/trusted pairs** prefer private trade → cheaper, can trade units, builds relationships
- **Solo/casual players** prefer public market → easy, safe, but expensive
- **Pirates** prey on private trade routes → meaningful interception gameplay
- **Trade-route builders** escort private convoys → counter-piracy gameplay
- **Market makers** buy low / sell high on the public market → financial gameplay

### 12.7 Piracy and Interception — Where It Lives

Under this model, piracy is concentrated on **private trade and direct transfers** — the channels where physical convoys move across the map. This is where the 2D world geography creates tactical depth:

| Piracy Mechanic | How It Works |
|-----------------|-------------|
| **Route scouting** | Pirates observe common trade corridors between allied bases |
| **Ambush positioning** | Station forces along chokepoints (mountain passes, river crossings) |
| **Convoy interception** | Attack resource-laden convoys in transit |
| **Tile control taxation** | Claim tiles along popular routes and demand tolls (payment in resources or credits) |
| **Blockades** | Surround an enemy base to prevent all physical trade/supply |

The public market cannot be pirated — but it's also 10–15% more expensive per side. This creates a risk/reward spectrum:

```
← Cheapest                                              Most Expensive →
← Most Risky                                            Least Risky →

  Direct Transfer   →   Private Trade   →   Public Market
  (free, full risk)     (free, full risk)   (10-15% fee, no risk)
  (no counterparty)     (negotiated)        (order book matching)
```

Players must constantly evaluate: is the 20–30% savings of private trade worth the interception risk? This evaluation depends on:
- Distance (longer routes = more exposure)
- Territory control (friendly vs. hostile territory)
- Military strength (can you protect the convoy?)
- Value of goods (high-value Crystal convoys are juicier targets)
- Trust in the trading partner (do they know your route? will they ambush you?)

This is rich, emergent gameplay that arises naturally from the channel structure.

### 12.8 The Besieged Player Problem

A critical test: can a player under military siege still trade?

| Channel | Under Siege? |
|---------|-------------|
| Direct transfer | ❌ — physical exit blocked |
| Private trade | ❌ — convoy can't leave |
| Public market (credits) | ✅ — can still sell/buy via credits |

This means the public market acts as an economic lifeline for besieged players. Is this a problem?

**Argument for allowing it:** A total siege should be hard to maintain. If an attacker wants to completely cut off a defender, they must also establish economic dominance (drain the defender's credits through prolonged siege). The public market gives the defender a fighting chance — they can sell surplus resources for credits and buy what they need, at premium market rates. This extends the game and prevents immediate capitulation.

**Argument against:** A siege should mean total isolation. If the defender can still buy Iron through the market while surrounded, the siege is "leaky."

**Recommended resolution:** Allow market access during siege, but with a **siege premium**. If a base is surrounded (enemies on N adjacent tiles), the market fee for that base increases to 25–30%. This makes market access during siege *possible but very expensive* — the defender can survive longer but is bleeding credits. The attacker benefits from the economic drain even without a perfect blockade.

### 12.9 Market Summary

| Design Decision | Recommendation | Rationale |
|-----------------|---------------|-----------|
| Trade channels | **Three-channel system** (Direct, Private, Public) | Each serves a distinct role with distinct risk/reward |
| Public market goods | **Resources only** | Units on the market breaks deployment logistics |
| Public market currency | **Credits only** (no barter) | Keeps market simple; private barter is the richer channel |
| Public market delivery | **Abstracted** (no convoy, fixed delay) | No physical pipeline to game; convenience offset by fee |
| Market fee | **10–15% per side** (credit sink) | Makes private trade 20–30% cheaper → preserves physical logistics incentive |
| Unit trading | **Private trade / direct transfer only** | Physical delivery, full interception risk |
| Piracy target | **Private trade convoys** | Physical movement on 2D map = interception gameplay |
| Siege access | **Allowed with siege premium** (25–30% fee) | Economic lifeline, but expensive; siege drains credits |
| Price discovery | **Order book** (buy/sell orders at limit prices) | Emergent supply/demand pricing for all resources |

---

## 13. Open Questions

1. **Processing yield adoption.** §11 recommends value-concentrating yields (yield < input_sum). Needs explicit decision: adopt the recommended yields from §11.5, or keep volume-conserving yields from §3? This choice affects all per-unit worth calculations and the recipe card in §10.4.

2. **Processing time.** Should cheaper products (Fuel) process faster than expensive ones (Electronics)? Or should all Tier 1 processing take equal time per batch? This affects throughput balance but is independent of the worth calculations here.

3. **Market fee calibration.** The 10–15% fee per side is a first estimate. Too low → market dominates over private trade. Too high → nobody uses the market. Needs playtesting.

4. **Market delivery delay.** What is the global delay for market-purchased resources to arrive? Too short → instant teleportation. Too long → market is useless. Suggested: 30–60 game ticks.

5. **Siege premium trigger.** How many hostile-controlled adjacent tiles constitute a "siege" for market fee purposes? Threshold determines how aggressively the siege premium kicks in.

6. **Credit inflation.** If the market creates resources ex nihilo (buying creates resources at buyer's base), is credit inflation a concern? The market fee acts as a credit sink, but the resource creation may need a corresponding resource drain elsewhere to prevent infinite resource generation. One option: the market draws from a global NPC-managed resource pool that drains as players buy, creating genuine scarcity on the market side.

7. **Unit pricing within tiers.** With the per-unit worth hierarchy established (either §3 or §11), how should individual unit costs be structured? Example: a T2 tank might cost "6 Steel + 2 Fuel" = 6×2.5 + 2×2.17 = worth 19.34 (using §11 values). This gives a worth-denominated "price tier" for cross-unit comparison.
