---
name: screenshot-qa
description: Quality-check OCR and vision loadout reads before compare-loadout against local Overframe builds.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Loadout, OCR, Compare]
    category: warframe
    related_skills: [loadout-compare]
---

# Screenshot QA

## When to use

Operator attaches a loadout screenshot, overlay captures a mod grid, or parsed mods look wrong before compare.

## Procedure

1. Identify surface: web Attach (vision or local tesseract), overlay capture, or pasted OCR text.
2. Expected flow: image → parse item + mods + arcanes → `compare-loadout`.
3. **QA parse** before comparing:
   - Item name matches catalog (`lookup` fuzzy match)
   - Mod count plausible (≤8 weapon, ≤10 frame)
   - No duplicate slots; watch polarity OCR errors
   - Arcanes separate from mods
4. Flag low confidence: blur, UI scale, partial crop, non-English client.
5. If wrong, ask for re-screenshot (full mod grid) or pasted mod list.
6. After clean parse, run compare vs top-3 local Overframe builds.
7. Do not compare on garbage OCR.

## Output shape

- Parse confidence (high / medium / low)
- Detected item + mods + arcanes
- Issues found (if any)
- Compare result (when parse OK)
- Retake guidance (if needed)
- Next step
