
----------

# Wargame X – Technical Design Document (Condensed)

**Design:** Ramón Pérez-Jansen  
**Programming:** Stef Hermans

## Core Concept

-   Real-time text-based strategy game.
-   Game loop based on simple 1-second tick.
-   Combat is calculated per tick, and takes place **simultaneous between players**.
-   Combat is based on combat rounds with a configurable fixed duration.

----------

## 1. Core Screens

### 1.0 Home

- Shows an overview of your bases and statistics.
- Shows a map view (partial visibility) around the players bases.
    -   Your bases
    -   Allies (blue), friends (green), enemies (orange), blacklist (red)
    -   Empty locations within 'radar range'
-   Click location → Location Overview.

----------

### 2.0 Score List
An overview of all players, their stats, status, etc.
-   Displays players: online status, net worth, research.
-   Sortable by metrics.
-   Actions:
    -   Message player
    -   Add friend / blacklist
-   Clicking player shows controlled locations.

----------

### 3.0 Location Overview

Information about a specific location on the map. Accessed via map view / radar, by coordinates, or a dropdown menu.
-   Displays:
    -  When empty: nothing
    -   Enemy: player info
    -   Ally/Friend: player info + war info
    -   Own location:
        -   Units, buildings, defenses
        -   Income, upkeep, storage

----------

### 4.0 Pending Wars
Screen serving as an overview of wars that have been fought, or are currently in progress.
-   Reports:
    -   🟢 Win / 🔴 Loss / 🟡 Ongoing
    - Details about the course of the combat.
-   Dynamic updates:
    -   Ongoing wars update the overview with the latest information after every combat round.
    - From the ongoing war messages after a round, tactics can be re-adjusted, or retreat can be called.
-   Reports show composition of enemy armies:
    -   If a war lasts a short duration → partial intel
    -   Survive the first round → full intel

----------

### 5.0 Social Lists

-   Allies (leader-only control)
-   Friends
-   Blacklist
-   Group messaging supported

----------

### 6–7. Messaging & Logout

-   Private messaging system
-   Logout returns to login page

----------

## 8. Resource System

### Resources

-   **Carbon (C)** – light units
-   **Metal (M)** – medium units
-   **Xtreemium (X)** – high damage / fast
-   **Hyperotonium (H)** – heavy armor / long range
-   -   Cash (derived total)

----------

### Storage & Flow

-   Refineries: storage = 1× cost
-   Silos: storage = 5× cost
-   Idle gatherers: storage = 3× cost
-   Resources flow:
    -   All → **Base Force 1**
    -   Then distributed by storage ratios

----------

### Overflow Rules

-   Excess stored in BF1
-   Decay:
    -   −40% per turn
-   Max effective storage:
    -   ~250% income (≈2.5 hours)
-   Attackers steal **100% overflow instantly**

----------

### 8.1 Assignment

-   Set % gathering per resource
-   Efficiency is **non-linear**

----------

### 8.2 Recycling

-   Returns: **20–80%**
-   Time formula:
    
    Time% = (Chosen% − 20) × 5/3
    
-   No recycling plant:
    -   Only 20% instant

----------

### 8.3 Repairs

-   Cost: **20% of original**
-   Requires Repair Bases
-   Speed scales with amount

----------

## 9. Base Construction

### Requirements

-   Needs Command Center (CC)

### Key Structures

-   Command Center
-   Heavy Construction Yard (highest armor)

----------

## 10. Production

Buildings:

-   Barracks
-   Light Factory
-   Heavy Factory
-   Airfield
-   Special Weapons Factory
-   Nuclear Silo

----------

## 11. Public Market

-   Buy / Sell / Recall
-   Selling:
    -   Removed only after purchase
    -   Value decreases over time/damage

----------

## 12. Research System

### Cost Formula

Depends on:

-   % bonus
-   Unit cost average
-   Level X

----------

### 12.1 Basic Research

Examples:

Type

Effect

Cost

Weapons

+4% damage

C=800X+6400

Armor

+3% armor

M=450X+4725

Propulsion

+speed & armor

H=1800X+9900

Weapon Propulsion

range exponent

multi-resource

Special:

R = R^(1 + 0.0125X)

----------

### Production Speed Upgrades

-   Infantry: +1%
-   Vehicles: +3%
-   Aircraft: +6%
-   Tanks: +9%
-   Special weapons: +15%

----------

### 12.2 Advanced Research

-   Per unit/defense category upgrades
-   Applies to armor & weapon types

----------

### 12.3 Upgrades

-   Specific systems (rifles, missiles, etc.)
-   Also increase **location capacity**

----------

## 13. Forces System

### Types

-   **Force (F)** → mobile
-   **Base Force (BF)** → static

### Limits

-   Based on Command Centers
-   Default size: **1,000,000 units**

----------

### Force Rules

-   Same-location transfer allowed
-   Deleting force → units go to BF1
-   New force:
    -   No units
    -   Default settings:
        -   Focus/Bait/Divide = 1

----------

## 13.2 Combat Orders

### Core Stats

-   D = Damage
-   A = Armor
-   Dm = Shots per turn

----------

### Real Damage (RD)

If **D ≤ A**:

RD = 0.1 × Dm × (D/A)^2

If **D ≥ A**:

RD = 0.1 × Dm

----------

### Focus (F1)

-   Prioritize targets
-   Cost factor:

F1 = T / (2 × G × P) + 1

----------

### Bait (F2)

-   Forces enemy targeting
-   Same formula as Focus

----------

### Divide (F3)

-   Reduces enemies engaged
-   Cost multiplier:

F3 = input value

-   Losses reduced proportionally

----------

### Total Cost

FT = F1 × F2 × F3

----------

### Explosive Behavior

-   Modes:
    -   Immediate
    -   On encounter
    -   On destruction
-   Ignore range rules

----------

## 13.3 Combat Execution

-   Highest range fires first
-   Same range = simultaneous
-   Combat resolves from range 11 → 1

----------

## A. War Resolution

### Non-enemy Rules

1.  Same player
2.  Allies
3.  Strength ratio > 2.5 (attacker vs defender)
4.  Strength ratio > 2.5 (attackers)

----------

### Combat Loop

For each range:

1.  Calculate damage vs armor types
2.  Apply:
    -   Focus
    -   Bait
    -   Unit counts
3.  Apply kills + damage
4.  Repeat next range

----------

## B. Cost Calculation

### Inputs

-   A, D, Dm, R, Sp

----------

### Base Cost Logic

If:

Sum(Dm×D) ≥ A

Then:

C = 0.5Σ(Dm×D) + 75  
M = 1.5A − 75

Else:

C = Σ(Dm×D) + 50  
M = A − 50

----------

### Modifiers

-   Speed/Range adjust cost
-   High stats → X and H
-   Normalize negatives
-   Redistribute resources

----------

### Final Cost

€ = € × (1 + 0.1(Sp + R − 4))

----------

### Rounding

-   Ensures clean resource distribution
-   Maintains total cost integrity

----------

## Research Cost Formula

Given:

-   P = % per upgrade
-   L = levels to target %
-   T = total cost

A = T / L²  
B = (T×L + T) / (2L²)  
Cost = AX + B

----------

## C. Production

Pt = 3600 × €unit / (€building × Nbuilding)

-   More buildings = exponential speed gain

----------

## D. Resources (Advanced)

### Regeneration

-   Fixed per location
-   Max total: €360,000
-   Distribution varies

----------

### Depletion

-   Over-harvesting shifts resource balance

----------

### Upkeep

-   Units consume resources
-   If depleted:
    -   Lose HP
    -   Then die
-   Order:
    1.  Carbon
    2.  Metal
    3.  Xtreemium
    4.  Hyperotonium

----------

## Key Design Principles

-   Trade-off between:
    -   Efficiency vs flexibility
    -   Cost vs survivability
-   Strong emphasis on:
    -   Targeting strategy (Focus/Bait/Divide)
    -   Resource logistics
    -   Timing (6-min turns)
