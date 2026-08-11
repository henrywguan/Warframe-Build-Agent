---
name: damage-simulator
description: Choose between offline modded DPS estimates and full damage/DoT/attenuation explanations.
---

# Damage simulator scope

## When to use

Player asks for weapon DPS, TTK, DoT, armor scaling, or “which hits harder” — and you must pick the right depth of analysis.

## Steps

1. Classify the question:

   | Use **simple offline DPS** | Use **deeper mechanics notes** |
   | --- | --- |
   | A vs B under same mod preset | Slash DoT ticks, viral proc windows |
   | Burst/sustained ranking | Armor/shield attenuation at level |
   | Preset shopping (`typical`, `rifle-viral-heat`) | Galvanized stack ramp, incarnon modes |
   | Quick `/dps` or chat compare | Riven-dependent min-max |
   | Steel Path elemental swap check | Multi-target falloff, beam lock |

2. For **simple path**, use modded-dps skill:
   ```bash
   npm run knowledge -- dps "<weapon>" --preset typical
   npm run knowledge -- compare-dps "A" "B" --preset rifle-viral-heat
   npm run knowledge -- preset-list
   ```
   Web: `/dps …` · Say clearly: arsenal-style estimate, preset `asOf` from `common-mods.json`.

3. For **deeper path**, ground mechanics in offline pack — do not invent formulas:
   - `npm run knowledge -- lookup "Damage"` / `"Status Effect"` / `"Armor"` / `"Critical Hit"`
   - Explain qualitatively: armor DR, status procs, faction weaknesses, DoT separate from direct DPS
4. **Never claim full simulation** when only CLI DPS ran; list known omissions (rivens, most arcanes, incarnon, galvanized stacks, slash ticks, TTK).
5. When player needs numbers the calculator lacks, say so and offer closest offline compare + mechanic explanation.
6. Apply **citation-check** for patch-sensitive weapon rankings.

## Output shape

- **Question type** (simple compare vs deep mechanic)
- **Tool used** (`dps` / `compare-dps` / mechanics digest)
- **Numbers** (if CLI) + preset name + `asOf`
- **Mechanic notes** (DoT, attenuation, proc) when relevant
- **Explicit limits** (what was not simulated)
- **Next step** (try preset, paste mods, lookup mechanic)
