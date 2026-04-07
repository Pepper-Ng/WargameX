# Mechanics Fundamentals

Cross-cutting mechanics invariants and baseline simulation rules.

## Core invariants
- Seeded world generation must be deterministic for identical inputs.
- Server-side state transitions must be tick-safe and replayable from persisted state.
- Resource and unit/building stats should never enter invalid (NaN/negative) states.
- Ownership and access checks must be enforced before state mutation.

## Simulation cadence (placeholder)
1. Snapshot queued player inputs.
2. Resolve economy and upkeep effects.
3. Resolve movement and world interactions.
4. Resolve combat interactions.
5. Persist resulting state and emit events.

## Notes
This file replaces separate global `rules/*` docs so implementation-facing rules live with mechanics.
