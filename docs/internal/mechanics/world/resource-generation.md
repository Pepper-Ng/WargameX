# Resource generation
Defines resource generation, accumulation, and extraction.

---

## Resource system

The resource system is terrain-driven and deterministic at its base layer.

Each tile generates raw resources over time based on:
- Biome
- Tile type
- Seed-based variation

---

## Resource types
### Raw resources
- **Carbon** — fuel / basic material  
- **Iron** — structural base  
- **Crystal** — energy / electronics base  
- **Oil** — volatile / chemical / fuel  

---

### Refined resources (processing layer)
- **Steel** — (Iron + Carbon)
- **Electronics** — (Iron + Crystal)
- **Fuel** — (Carbon + Oil)

---

### Advanced resources
- **Composite** — (Steel + Electronics)
- **Plasma** — (Fuel + Crystal)

---

## Resource generation model
### Resource seeding
Each tile is initialized with **static generation rates** for each of the 4 raw resources. These rates define how resources accumulate over time.

```json
resourceRates: {
  carbon: number,
  iron: number,
  crystal: number,
  oil: number
}
```

Tiles resource generation rates are deterministic based on:
- Fully determined by `(seed, x, y)`.
- Derived from biome, tile type, and seed-based variation.
- Constant over the lifetime of the tile.

### Biome / tile influence
Resource generation rates are influenced by **tile type**
| Tile Type | Carbon | Iron      | Crystal | Oil       |
| --------- | ------ | --------- | ------- | --------- |
| Forest    | High   | Low       | Low     | Medium    |
| Rock      | Low    | High      | Low     | Low       |
| Mountain  | Low    | Very High | High    | Low       |
| Sand      | Low    | Medium    | High    | Medium    |
| Plains    | Medium | Medium    | Medium  | Medium    |
| Water     | None   | None      | Low     | High      |
| Oil       | None   | Low       | Low     | Very High |
| Ice       | Low    | Low       | High    | Low       |
| Swamp     | High   | Low       | Low     | High      |

Biomes provide a slight additional bonus to resource generation in particular matching tile types:
- Tundra: 5% bonus for iron and minerals in `rock`, `ice` and `sparse forest` tiles.
- Temperate: 2% bonus for all resources in `forest` and `plains` tiles.
- Desert: 5% bonus for oil and minerals in `sand`, `rock` and `oil` tiles.
- Jungle: 5% bonus for carbon and oil in `dense forest`, `swamp` tiles.
- Mountain: 10% bonus for iron and minerals in `mountain`, `rock` tiles.
- Ocean: 10% bonus for oil in `water` and `oil` tiles.

## Resource etraction model
Resources are extracted by:
- Bases (specialized buildings)
- Forces (specialized units)

Extraction:
- Reduces `resourceAmount`.
- Is limited by unit/building capability.

### Non-buildable tile extraction
Some tiles like `water` are not directly buildable. To facilitate extracting resources from these tiles, resource extraction can be done by an adjacent tile.

**Adjacent tile extraction**
- Compatible resource collection entities are built on a neighboring valid tile.
- Resource collection entity requires sufficient range to extract from a neighboring tile.
- Extraction targets tiles in range.
- Output is delivered locally.
- Subject to a 20% `distance penalty` to the default collection rate.

### Resource distribution constraints
- Density curves and regional caps
- Regional caps
- Regeneration/depletion behavior
- Fairness constraints around player spawn areas
- Anti-exploit constraints
