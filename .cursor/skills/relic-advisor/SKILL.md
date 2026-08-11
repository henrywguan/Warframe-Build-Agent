---
name: relic-advisor
description: Advise on Void Relics — part drops, vaulted status, radshare etiquette, and refinement strategy.
---

# Relic advisor

## When to use

Player asks which relic drops a part, whether it is vaulted, how to refine for radshare, or which fissure tier to run.

## Steps

1. Lock the target: **Prime part name**, full set, or specific relic tier (Lith/Meso/Neo/Axi/Requiem/Omnia).
2. Ground relic mechanics in the offline pack first:
   - `npm run knowledge -- lookup "Void Relic"`
   - `npm run knowledge -- lookup "<Prime part or relic name>"`
3. For **live fissures**, use worldstate only when timing matters:
   - `npm run wf -- fissures`
   - `npm run wf -- fissures --steel-path` when SP fissures matter
4. Determine **vaulted vs unvaulted** from pack digest + market signals:
   - `npm run market -- price <prime_part_slug>` — vaulted parts often spike when unavailable in fissures
5. **Refinement guidance**: Intact vs Exceptional/Flawless/Radiant based on goal (personal opening vs radshare host).
6. **Radshare etiquette**: host radiant when seeking rare part; match tier; note duplicate protection does not apply across players.
7. Suggest **farm routes** for relic acquisition when not in fissure pool (e.g. endless rotation, Void, bounties) via `npm run knowledge -- farm "<relic or part>"`.
8. Do not invent drop tables or relic contents.

## Output shape

- **Target part(s)** + relic name(s) if known
- **Vault status** + how to obtain (fissure / unvault / trade)
- **Refinement recommendation** (intact → radiant) with reason
- **Radshare tips** (host vs join, tier match)
- **Live fissures note** (if checked)
- **Trade alternative** (`npm run market -- price`)
- **Next step** (refine, host, check fissures, buy part)
