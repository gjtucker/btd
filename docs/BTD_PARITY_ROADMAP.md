# BTD Parity Roadmap

This roadmap outlines practical improvements to make this clone feel closer to official Bloons Tower Defense titles.

## 1) Core bloon system parity

- Add additional bloon classes and properties:
  - Zebra, Lead, Rainbow, Ceramic, MOAB-class bloons.
  - Camo and Regrow flags as layered traits instead of separate bloon types.
- Track multi-layer health properly (e.g. Ceramic and MOAB shells) so damage can remove multiple child layers when appropriate.
- Distinguish leak penalty from display color:
  - In official games, tougher bloons often cost multiple lives when leaked.

## 2) Tower progression parity

- Replace the current linear upgrade chain with BTD-style upgrade paths:
  - 3 paths per tower.
  - Tiered unlocks and path caps (e.g. 5-5-5 disabled, with configurable rules by game version).
- Add tower class roles and utility towers:
  - Economy (Banana Farm equivalent), support buffs (Village/Alchemist-like), and crowd control.
- Introduce tower targeting options beyond First/Last/Strong/Close:
  - Include independent subtargeting where needed (e.g. mortar-style targeting, heli pursuit modes).

## 3) Round scripting and pacing parity

- Move from static wave arrays to authored round scripts:
  - Use spawn timestamps and lane batches instead of simple count + spacing.
  - Allow mixed grouped rushes and difficulty spikes with deterministic timing.
- Add freeplay scaling model:
  - Separate scaling for speed, health, and fortification behavior after late rounds.
- Include pre-round intel:
  - Show incoming bloon icons/properties to support strategic planning.

## 4) Economy and reward parity

- Rebalance economy model:
  - Round-end bonus formula.
  - Pop cash by bloon layer, not only displayed bloon instance.
  - Sellback and interest/economy behavior.
- Add difficulty presets:
  - Starting cash/lives and round-set changes per difficulty.

## 5) Combat simulation fidelity

- Convert combat timings to time-based units everywhere:
  - Tower cooldowns and projectile movement should use `dt` consistently.
  - Keep frame-rate independent simulation for fairness.
- Improve projectile rules:
  - Implement true pierce + damage interactions.
  - Add splash falloff and status effects (stun, burn, slow, glue) with stacking rules.
- Add proper line-of-sight/blocking behaviors for towers that require it.

## 6) Map and mode parity

- Support multiple maps with metadata:
  - Path geometry, blocker zones, water/land placement constraints, LOS blockers.
- Add game modes:
  - Sandbox, challenge modifiers, alternate rounds, and hard/impoppable-style rule sets.

## 7) UX and polish parity

- Add battle readability improvements:
  - Better hit feedback, pop counters, damage numbers, and clearer status icons.
- Implement richer HUD:
  - XP/leveling (if desired), income tracker, monkey stats, and round preview details.
- Add save/load progression:
  - Persistent profile stats, unlock progression, and settings.

## Suggested implementation order

1. **Simulation correctness first**: dt-based cooldowns, layered bloon health, leak penalties.
2. **Content expansion next**: new bloons/towers + proper upgrade paths.
3. **Round authoring tooling**: scripted round format and validator.
4. **Meta systems**: difficulty presets, modes, progression, and polish.

## Acceptance criteria for “feels like BTD”

- Players can identify expected counters (e.g. explosive immunity, camo threats).
- Upgrade decisions are path-driven and strategic, not linear.
- Round pacing has recognizable spikes and recovery windows.
- Economy choices (greed vs defense) are meaningful across at least 40+ rounds.
- Runs remain deterministic and fair at different frame rates.
