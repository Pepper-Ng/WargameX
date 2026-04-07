# Map Generation

## Current implementation notes
- Deterministic, seed-based biome generation.
- Active seed sourced from map settings utilities.
- Tile generation is performed on demand with warmup at startup.
- Debug endpoint supports full map regeneration with a supplied seed.

## Required invariants
- Same seed + coordinates must always yield identical biome output.
- Generation logic must be side-effect free apart from persistence.
- Regeneration must clear/rebuild tile state consistently.

## Resource distribution coupling (provisional)
Resource distribution is intentionally documented together with map generation because spawn/density behavior is terrain-coupled.

### Placeholder structure
- Spawn model (per tile / per region / per biome)
- Density curves and regional caps
- Regeneration/depletion behavior
- Fairness constraints around player spawn areas
- Anti-exploit constraints

## Future sections
- Biome weight model
- Noise function and coordinate transforms
- Chunk/window generation strategy
- Regeneration safety and migration concerns
