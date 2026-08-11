---
name: relic-advisor
description: Advise on Void Relics — part drops, vaulted status, radshare etiquette, and refinement strategy.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Relics, Fissures, Prime]
    category: warframe
---

# Relic advisor

## When to use

Operator asks which relic drops a part, vaulted status, radshare/refinement strategy, or fissure tier to run.

## Procedure

1. Lock target: Prime part, full set, or relic tier (Lith/Meso/Neo/Axi/Requiem/Omnia).
2. Offline pack first:
   - `npm run knowledge -- lookup "Void Relic"`
   - `npm run knowledge -- lookup "<part or relic>"`
3. Live fissures when timing matters:
   - `npm run wf -- fissures` / `fissures --steel-path`
4. Vaulted vs unvaulted: pack digest + `npm run market -- price <slug>`.
5. Refinement: Intact → Radiant based on personal open vs radshare host.
6. Radshare: host radiant for rare part; match tier; no cross-player duplicate protection.
7. Relic acquisition routes: `npm run knowledge -- farm "<relic or part>"`.
8. Do not invent relic contents.

## Output shape

- Target part(s) + relic name(s)
- Vault status + obtain path
- Refinement recommendation + reason
- Radshare tips
- Live fissures note (if checked)
- Trade alternative
- Next step
