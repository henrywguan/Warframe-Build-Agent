# Warframe Build Agent overlay

Desktop overlay for arsenal / mod-screen coaching: saved screen regions (snipping-tool style), one-button capture, and a clean action list aimed at Steel Path / max damage / endgame goals.

## Hard policy: fully external (no memory editing)

This overlay is **external-only** by design and must stay that way.

| Allowed | Forbidden |
| --- | --- |
| Own always-on-top UI window | Reading / writing Warframe process memory |
| OS desktop capture of user-selected regions | DLL / graphics injection into the game |
| Manual loadout / goal input | Global input hooks or sending keys/clicks into Warframe |
| Local config + capture PNGs | Opening handles / enumerating the Warframe process |
| Public APIs / docs for advice | Packet tampering, debug attach, trainers, admin/root requirement |

### Anti-cheat / Easy Anti-Cheat reality check

**No safeguard can guarantee Warframe or Easy Anti-Cheat will never false-positive.** Detection rules are proprietary and can change.

What we *can* do is keep this app in the lowest-risk class of software:

- A normal separate OS window (not drawn inside the game)
- Optional desktop-region screenshots (same broad class as snipping tools)
- Window-scoped hotkeys only (no global low-level hooks)
- Zero contact with the Warframe process
- Refuse to run elevated (admin/root)

That reduces risk versus memory tools, injectors, and input bots — it is **not** a promise of undetectability or of zero false positives.

### Safeguards (fail closed)

| Layer | What it does |
| --- | --- |
| Policy module | [`policy.py`](../overlay/wf_overlay/policy.py) external-only + anti-cheat risk-reduction flags |
| Runtime import blocker | Blocks `pymem`, `frida`, `pynput`, `psutil`, `dxcam`, etc. |
| Startup source scan | Rejects process-memory, injection, global-hook, and game-exe targeting APIs |
| Dependency scan | `requirements.txt` must not list high-risk packages |
| Privilege check | Refuses admin/root elevation |
| Capture/hotkey posture | Requires `mss` desktop capture + `QShortcut` window hotkeys |
| Verify command | `python3 -m wf_overlay --verify-external` |

The UI **will not start** if verification fails. Future OCR/vision may only read **captured screen pixels** or user-entered text — never the game’s address space.

```bash
cd overlay
python3 -m wf_overlay --verify-external
```

## Why this shape

- **Saved regions**, not whole-screen OCR — more accurate and less noisy on Warframe UI
- **Action cards**, not a fake DPS readout — recommendations come from loadout context + rules
- **Python + PySide6** — fast to iterate; fine latency for hotkey / button workflows
- **External pixels only** — safe boundary vs memory tools

OCR → mod ID mapping can plug in later on top of saved captures; v1 focuses on the interactive overlay UX and recommendation actions.

## Setup

```bash
cd overlay
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 -m wf_overlay
```

Or from repo root after installing requirements into your environment:

```bash
python3 overlay/run.py
```

Needs a desktop session (Windows / Linux / macOS with a display). This cloud/dev VM may not show the window.

## Using it in Warframe

1. Open Warframe arsenal or mod screen
2. In the overlay, enter weapon/Warframe name and pick slot + goal
3. **Set region** → drag over the mod grid (and optionally the stats panel)
4. **Capture** saves a PNG under `~/.config/warframe-build-agent/captures/`
5. **Refresh actions** shows prioritized next steps

### Hotkeys

| Shortcut | Action |
| --- | --- |
| `Ctrl+Shift+A` | Refresh recommended actions |
| `Ctrl+Shift+R` | Set/capture region selector |
| `Ctrl+Shift+C` | Capture the selected saved region |
| `Ctrl+Shift+H` | Show / hide overlay |

## Config locations

| Path | Purpose |
| --- | --- |
| `~/.config/warframe-build-agent/overlay-regions.json` | Saved snip regions |
| `~/.config/warframe-build-agent/captures/` | Region screenshots |

## Tests

```bash
cd overlay
python3 -m wf_overlay --verify-external
python3 -m unittest discover -s tests -v
```

## Roadmap (not in v1)

- OCR / vision parse of **captured** mod-grid images into mod IDs (still external-only)
- Feed parsed loadout into the web chat / agent tools
- Optional click-through mode when not interacting with the overlay window
- Richer endgame presets (EDA/ETA, archon, etc.)
