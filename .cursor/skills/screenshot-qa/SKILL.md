---
name: screenshot-qa
description: Quality-check OCR and vision loadout reads before compare-loadout against local Overframe builds.
---

# Screenshot QA

## When to use

Player attaches a loadout screenshot, overlay captures a mod grid, or parsed mods look wrong before compare.

## Steps

1. Identify surface: **web chat Attach** (vision or `CHAT_MODE=local` tesseract), **overlay capture**, or pasted OCR text.
2. Expected flow: image → parse item + mods + arcanes → `compare_loadout_to_overframe` / `npm run knowledge -- compare-loadout`.
3. **QA the parse** before comparing:
   - Item name matches a catalog entry (`lookup` fuzzy match)
   - Mod count plausible (≤8 weapon, ≤10 frame with aura/exilus)
   - No duplicate slots; polarity mistakes common in OCR
   - Arcanes listed separately from mods
4. Flag low-confidence reads: blurry text, UI scale, non-English client, partial crop.
5. If parse is wrong, ask player to **re-screenshot** (full mod grid, default UI scale) or paste mods as text.
6. Web: vision model via `OPENAI_VISION_MODEL`; local mode uses tesseract — note which path ran.
7. After clean parse, run compare and present **diff vs top-3** local Overframe builds.
8. Do not compare on garbage OCR — fix parse first.

## Output shape

- **Parse confidence** (high / medium / low)
- **Detected** item + mods + arcanes
- **Issues found** (if any)
- **Compare result** (when parse OK)
- **Retake guidance** (if needed)
- **Next step**
