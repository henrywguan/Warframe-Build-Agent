# Warframe Build Agent overlay

Desktop overlay for arsenal / mod-screen coaching: saved screen regions (snipping-tool style), one-button capture, and a clean action list aimed at Steel Path / max damage / endgame goals.

## Hard policy: fully external (no memory editing)

This overlay is **external-only** by design and must stay that way.

| Allowed | Forbidden |
| --- | --- |
| Own always-on-top UI window | Reading Warframe process memory |
| OS screen capture of user-selected regions | Writing Warframe process memory |
| Manual loadout / goal input | DLL injection / hooks into the game |
| Local config + capture PNGs | Sending keys/clicks into Warframe |
| Public APIs / docs for advice | Packet tampering, debug attach, trainers |

### Safeguards (fail closed)

| Layer | What it does |
| --- | --- |
| Policy module | [`policy.py`](../overlay/wf_overlay/policy.py) declares external-only contract |
| Runtime import blocker | [`external_guard.py`](../overlay/wf_overlay/external_guard.py) refuses `pymem` / `frida` / similar imports |
| Startup source scan | App scans its own Python tree for `ReadProcessMemory`, `OpenProcess`, `/proc/`, ptrace, etc. |
| Dependency scan | `requirements.txt` must not list memory-tooling packages |
| Unit tests | CI-style checks that the tree stays clean and the blocker works |
| Verify command | `python3 -m wf_overlay --verify-external` prints PASS/FAIL |

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
