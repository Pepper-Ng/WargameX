# Movement

Movement in Wargame X is tile-based: a force always occupies exactly one tile, and when it travels toward a destination it advances one tile at a time on the game tick cadence, with the pace determined by its speed and the terrain it crosses.

---

## Movement Cadence

When a force receives a move order it begins advancing toward the destination. Each game tick, the force's position may be updated by moving it to the next tile along its path. A force always occupies exactly one tile; there is no sub-tile position.

The number of ticks required to cross a single tile depends on the force's **speed** and a terrain **cost multiplier** applied to the destination tile. The movement rule is:

$$
\text{ticks per tile} = \left\lceil \frac{C_{\text{tile}}}{\text{speed}} \right\rceil
$$

where $C_{\text{tile}}$ is the tile's crossing cost and $\text{speed}$ is the force's movement speed in arbitrary units. Base tile crossing costs are defined in [Terrain Crossing Costs](#terrain-crossing-costs).

---

## Movement Types

Three primary movement types determine which tiles a force can enter and how terrain costs apply.

| Movement Type | Passable terrain | Notes |
|---|---|---|
| **Ground** | Plains, Sand, Forest, Swamp, Rock, Mountain, Oil, Ice | Cannot enter Water tiles |
| **Air** | All tile types | Ignores terrain cost modifiers; moves at full speed everywhere |
| **Naval** | Water | Cannot enter land tiles |

A force's movement type is a property of its unit composition. Mixed forces, such as a group containing both ground and air-capable units, use the most restrictive passable set.

## Terrain Crossing Costs

The time a ground force takes to cross a tile is multiplied by the tile's crossing cost. Air units ignore all terrain modifiers; naval units move only on Water.

| Tile Type | Ground cost | Air cost | Naval cost |
|-----------|-------------|----------|------------|
| Plains    | ×1.0        | ×1.0     | —          |
| Sand      | ×1.2        | ×1.0     | —          |
| Forest    | ×1.5        | ×1.0     | —          |
| Rock      | ×1.5        | ×1.0     | —          |
| Ice       | ×1.8        | ×1.0     | —          |
| Swamp     | ×2.0        | ×1.0     | —          |
| Mountain  | ×2.5        | ×1.0     | —          |
| Oil       | ×1.2        | ×1.0     | —          |
| Water     | impassable  | ×1.0     | ×1.0       |

A dash (—) means the tile type is impassable for that movement type.

---

## Pathing

Forces move in **8 directions**: the four cardinal directions (N, S, E, W) and the four diagonals. For movement purposes, diagonal steps cover the same effective tile distance as cardinal steps.

The route from origin to destination is computed when the order is given, using the terrain cost model. If the direct route is blocked by impassable terrain, the path routes around the obstacle. If no valid path exists, the move order is rejected.

---

## Stacking and Encounter

Multiple forces may occupy the same tile simultaneously.

- **Friendly forces** on the same tile coexist with no penalty.
- **Enemy forces** on the same tile are in **conflict**. Battle begins automatically when opposing forces occupy the same tile at the end of a tick.

There is no stacking limit for friendly forces.

---

## Visibility and Exploration

As a force moves, it reveals the tiles it passes through and a surrounding radius determined by its **visibility range**. Tiles outside the revealed area remain under fog of war. Visibility range is a per-force property, so faster or more specialised forces may see more or less of the map than standard formations.

Revealed tiles remain visible only while they are within range of a friendly force. When a force leaves an area, tiles that are no longer covered by any friendly visibility return to fog.

---

## Attrition

Forces can wear down over time through two mechanisms that stack.

**Supply attrition**: A force that operates beyond a viable supply line — too far from a friendly base or without a forward supply chain — gradually loses readiness each tick. Readiness loss increases with distance from the nearest supply source. Forces that return to supply range recover over time.

**Terrain attrition**: Forces that remain stationary in harsh terrain (Mountain, Swamp, or Ice) accumulate environmental wear each tick they do not move. Moving out of the terrain stops and reverses the penalty. This makes prolonged encampment in difficult terrain costly and encourages dynamic front lines.

The two effects are independent and additive. Combat readiness lost to attrition reduces a force's effectiveness in battle; the specific readiness model is defined in the combat mechanics.

---

## Future / Planned

- **Zone of control**: Whether and how enemy adjacency restricts or penalises movement (closely tied to combat mechanics; will be designed alongside them).
- **Mixed-force movement type resolution**: Detailed rules for forces that combine unit types with different movement capabilities.
- **Terrain attrition thresholds and readiness model**: Specific numeric rates for supply attrition decay and terrain penalty accumulation, to be defined with the combat system.

---

## See Also

- [Map Structure](./map-structure.md) - tile types and passability flags
- [Forces](../../backend/README.md) - force composition and unit properties
