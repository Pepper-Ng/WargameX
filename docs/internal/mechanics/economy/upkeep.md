# Economy: Upkeep

This document defines how ongoing resource costs are paid in WargameX, which storage pool each upkeep domain draws from, what happens when upkeep cannot be paid, and how systems recover after resupply.

Quantitative values such as per-tick upkeep costs, unit cargo capacities, attrition rates, and building throttling magnitudes are defined in subsystem documents rather than here.

---

## Scope

Upkeep is the continuous resource drain required to keep the following systems operational:

- Units
- Buildings
- Active research

This document builds on the distributed storage model defined in [Economy: Resources](./resources.md). In particular, upkeep is not covered by a global player stockpile. Payment always resolves from a concrete storage source: either a base's local inventory or a unit's carried cargo.

---

## Upkeep Cadence

Upkeep is deducted every game tick during step 2 of the simulation cadence defined in [Mechanics Fundamentals](../fundamentals.md).

| Simulation step | Upkeep behavior |
| --- | --- |
| 2. Resolve economy and upkeep effects | All upkeep domains attempt to pay their per-tick resource costs |

This means upkeep resolves before movement and world interactions in [Movement](../world/movement.md), and before combat for that tick.

---

## Upkeep Payment Model

Upkeep payment source depends on the entity type and current state.

### Units

Units do not use a single universal payment source. Their upkeep source depends on whether they are stationed at a base or operating away from it.

| Unit state | Upkeep source | Result |
| --- | --- | --- |
| Stationed at a base | That base's local storage | Unit upkeep is paid from base inventory |
| Away from base | The unit's own carried cargo | Unit upkeep is paid from carried resources |

Key rules:

- A unit or force stationed at a base consumes from that base's local storage.
- A unit or force on the move or operating in the field consumes from its own carried resources.
- If a unit's carried cargo runs out while away from base, attrition begins immediately.
- Carry-capacity and other unit-side storage constraints belong in [Units: Stats](../units/stats.md).

### Buildings

Buildings always pay upkeep from the local storage of the base they belong to.

- Buildings do not maintain an independent upkeep cargo pool.
- One base's surplus does not automatically cover another base's buildings.
- Building upkeep therefore follows the same distributed-storage logic established in [Economy: Resources](./resources.md).

### Research

Research upkeep is paid from the local storage of the base running that research.

Key rules:

- Research automatically pauses when that base cannot pay its research upkeep.
- Research automatically resumes when resources are restored.
- No accumulated research progress is lost while paused.

> **Design note:** Priority ordering between research, production, and other resource-consuming systems is still open. Player-configurable priority ordering may be added later, but no final resolution order is locked here beyond upkeep occurring during simulation step 2.

---

## Upkeep Resource Types

The upkeep framework is confirmed: each unit class and building type consumes resource types that reflect its real-world role. Exact quantities remain deferred.

> **Design note:** This resource mapping is provisional at the per-entity level. The framework and thematic intent are confirmed, but exact per-tick resource costs remain TBD and must be defined in [Units: Stats](../units/stats.md) and [Buildings: Production](../buildings/production.md).

| Entity type | Resource A | Resource B | Notes |
| --- | --- | --- | --- |
| Infantry / soldiers | Carbon | Iron | Food and basic supplies plus weapons maintenance |
| Ground vehicles / tanks | Fuel | Iron | Propulsion plus mechanical upkeep |
| Aircraft | Fuel (high) | Electronics | Heavy energy use plus avionics maintenance |
| Naval units | Fuel | Iron | Propulsion plus hull maintenance |
| Basic buildings | Carbon | Iron | Structural and tool maintenance |
| Production buildings (factories, refineries) | Fuel | — | Operational energy |
| Research facilities | Crystal | Electronics | Precision instruments and advanced materials |
| Advanced buildings | Electronics | — | Complex systems maintenance |

Design intent for the resource roles:

- Carbon represents organic consumption and basic survival needs.
- Iron represents mechanical wear, structural upkeep, and replacement parts.
- Fuel represents propulsion and ongoing energy demand.
- Crystal represents precision materials used in advanced or research-intensive systems.
- Electronics represents advanced systems maintenance and control hardware.

---

## Deficit and Attrition

When upkeep cannot be paid, the affected system enters a deficit state. Consequences differ by domain.

### Units and Forces

When a unit or force runs out of the resources needed to sustain itself, failure is gradual rather than binary.

Confirmed behavior:

1. HP attrition begins immediately.
2. Combat effectiveness degrades alongside HP loss.
3. If attrition continues long enough, units eventually die.
4. Dead units leave resource scraps that are automatically recovered, partially funding the remaining upkeep burden.

Additional detail:

- Combat effectiveness is not a separate upkeep-specific stat. It declines because the unit's HP declines.
- Scrap recovery creates a self-liquidating death spiral rather than an instant collapse of the entire force.
- The force remains operational while attrition is ongoing, but in a steadily weaker state.

> **Design note:** Movement-speed reduction during attrition is provisional. One candidate extension is a player-controlled mechanic that deliberately reduces speed in exchange for lower upkeep consumption while in the field. Neither the slowdown rule nor the optional reduced-speed upkeep mode is final yet.

### Buildings

When a base cannot pay building upkeep, buildings degrade functionally before they stop working.

Confirmed behavior:

1. Affected buildings enter throttled mode and reduce production output.
2. If the deficit continues, affected buildings shut down completely and become inactive.
3. Buildings do not currently lose HP or structurally degrade from unpaid upkeep.

Operational implications:

- Throttling is the first failure stage.
- Shutdown is the second failure stage.
- The exact throttle magnitude and exact shutdown timing are balance values, not specified here.

> **Design note:** The assumption that buildings do not take HP damage from unpaid upkeep is provisional. Structural degradation may be introduced later, but it is not part of the current confirmed rules.

### Research

Research uses the softest deficit behavior of the three upkeep domains.

Confirmed behavior:

- Research pauses automatically when its upkeep cannot be paid.
- Research resumes automatically once resources are restored.
- No progress is lost during the pause.

Research therefore behaves as an on/off consumer rather than an attrition-based system.

---

## Recovery

Deficit states are reversible if the player restores supply through normal logistics.

### Units

- If a starving unit or force is resupplied, upkeep resumes normally from the appropriate payment source.
- Units that lost HP during attrition do not automatically recover that HP.
- Recovering lost HP requires repair, reinforcement, or another dedicated restoration mechanic.

> **Design note:** Repair and reinforcement rules are still TBD and should be specified with the relevant unit and logistics systems.

### Buildings

- Shut-down buildings resume automatically once the base can again pay their upkeep.
- Buildings in throttled mode return to normal operation when the upkeep deficit ends.

### Research

- Paused research resumes automatically as soon as the required upkeep can once again be paid.
- Because no progress is lost, recovery is a continuation rather than a restart.

---

## Relationship to Logistics and Movement

Upkeep pressure is intentionally tied to logistics exposure.

- Base-based systems depend on the local stockpile rules defined in [Economy: Resources](./resources.md).
- Fielded units depend on the resources they physically carry.
- Resupply therefore depends on normal transport and travel constraints rather than instant transfer.
- Units operating farther from a base remain exposed to the risks and travel times defined in [Movement](../world/movement.md).

This keeps sustained deployment, forward operations, and supply disruption as core strategic concerns rather than hidden background math.

---

## System Summary

| Topic | Confirmed rule |
| --- | --- |
| Upkeep cadence | Deducted every game tick |
| Simulation timing | Resolved in step 2 of the simulation cadence |
| Upkeep domains | Units, buildings, active research |
| Stationed unit payment source | Local storage of the base where the unit is stationed |
| Field unit payment source | The unit's own carried cargo |
| Field unit failure trigger | Attrition begins immediately when carried upkeep resources run out |
| Building payment source | Local storage of the owning base |
| Research payment source | Local storage of the base running the research |
| Research on deficit | Automatically pauses |
| Research on resupply | Automatically resumes with no lost progress |
| Unit deficit effect | HP attrition begins immediately |
| Unit combat impact | Effectiveness declines with HP loss |
| Unit terminal state | Continued attrition eventually kills units |
| Unit death aftermath | Dead units leave resource scraps that are automatically collected |
| Building deficit stage 1 | Production output is throttled |
| Building deficit stage 2 | Building shuts down and becomes inactive |
| Building HP loss from deficit | Not currently part of the confirmed rules |
| Recovery source | Normal logistics and resupply |
| Unit HP recovery | Not automatic after attrition |
| Building recovery | Automatic when upkeep can be paid again |

This specification is complete for the confirmed structural rules of upkeep. Numeric upkeep values, attrition rates, cargo capacities, building-throttle magnitudes, repair rules, and final system-priority ordering remain intentionally deferred to dedicated subsystem documents.
