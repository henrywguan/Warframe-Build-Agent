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
- Large clickable buttons for every action
- Minimizable **Agent chat** box (OpenAI-compatible HTTPS — still external)
- Optional desktop-region screenshots (same broad class as snipping tools)
- Optional **OS-registered** global hotkeys on Windows (`RegisterHotKey`) — not low-level hooks, and they do not type into Warframe
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
| Capture/hotkey posture | `mss` desktop capture; buttons + `QShortcut`; optional Windows `RegisterHotKey` |
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
- **Warframe-inspired theme** — void panels, Orokin gold frames, energy cyan controls (original styling, not game assets)

Install optional fonts **Rajdhani** or **Orbitron** for a closer arsenal look; otherwise Segoe UI is used.

OCR → mod ID mapping can plug in later on top of saved captures; v1 focuses on the interactive overlay UX and recommendation actions.

## Setup

```bash
cd overlay
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Optional in-game chat (OpenAI-compatible)
mkdir -p ~/.config/warframe-build-agent
cp overlay.env.example ~/.config/warframe-build-agent/overlay.env
# edit overlay.env and set OPENAI_API_KEY

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

### Buttons + hotkeys

Use the **Quick actions** buttons anytime (recommended). The same actions also have hotkeys:

| Button / shortcut | Action |
| --- | --- |
| Refresh actions · `Ctrl+Shift+A` | Refresh recommended actions |
| Set region · `Ctrl+Shift+R` | Snip a screen region |
| Capture · `Ctrl+Shift+C` | Capture the selected saved region |
| Show / hide · `Ctrl+Shift+H` | Minimize / restore overlay |
| Chat panel · `Ctrl+Shift+T` | Minimize / expand the in-overlay agent chat |

Toggle **Enable global hotkeys (Windows)** to keep those chords working while Warframe is focused. On Linux/macOS, focus the overlay or click the buttons.

### In-game agent chat

The overlay includes a **minimizable chat box** tied to the Warframe Build Agent:

1. Set `OPENAI_API_KEY` in env or `~/.config/warframe-build-agent/overlay.env`
2. Click **Chat panel** (or `Ctrl+Shift+T`) to expand/minimize
3. Ask build / comparison / Steel Path questions while arsenal is open
4. Loadout fields (weapon, slot, goal, notes) are sent as context with each message

Optional: set `CHAT_API_URL=http://127.0.0.1:3000/api/chat` to use a running `web/` backend instead of calling the model provider directly (works best when the web app has no `CHAT_PASSWORD`, or you handle auth separately).

## Config locations

| Path | Purpose |
| --- | --- |
| `~/.config/warframe-build-agent/overlay-regions.json` | Saved snip regions |
| `~/.config/warframe-build-agent/captures/` | Region screenshots |
| `~/.config/warframe-build-agent/overlay.env` | Chat API key / model / optional web chat URL |

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
