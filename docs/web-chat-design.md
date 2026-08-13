# Web chat design reference

Visual / interaction inventory for the mobile web chat UI in [`web/`](../web/). Use this when redesigning, restyling, or matching the Ordis arsenal look elsewhere.

Canonical source files:

| Area | Path |
| --- | --- |
| Tokens + page chrome | [`web/src/app/globals.css`](../web/src/app/globals.css) |
| Layout, bubbles, chips, composer | [`web/src/app/page.module.css`](../web/src/app/page.module.css) |
| Fonts / PWA meta | [`web/src/app/layout.tsx`](../web/src/app/layout.tsx) |
| Ordis stage motion | [`web/src/components/OrdisStage.module.css`](../web/src/components/OrdisStage.module.css) |
| Ordis SVG paints | [`web/src/components/OrdisStage.tsx`](../web/src/components/OrdisStage.tsx) |
| Icon / PWA mark | [`web/public/ordis-icon.svg`](../web/public/ordis-icon.svg), [`web/public/manifest.webmanifest`](../web/public/manifest.webmanifest) |

Product/behavior (toggles, LLM, Online search) stays in [`web-chat.md`](web-chat.md).

---

## Design direction

- **Theme:** Warframe arsenal / void-ship console — dark void panels, Orokin gold rules, energy cyan accents.
- **Brand signal:** “Warframe Build Agent” + center-stage Ordis cephalon (original SVG/CSS, not game assets).
- **Shape language:** Sharp / near-zero radius (`2px` / `1px`). Avoid pills and soft cards.
- **Atmosphere:** Layered radial gradients + faint cyan/gold grid overlay (not a flat fill).
- **Motion:** Entrance rise on shell pieces; Ordis idle / thinking / speaking moods; chip/send hover lift.

---

## Color tokens

Defined on `:root` in `globals.css`:

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#e8eef5` | Primary text |
| `--ink-soft` | `rgba(196, 208, 220, 0.72)` | Secondary text, captions, status |
| `--void` | `#04070c` | Deepest black / void |
| `--panel` | `rgba(10, 16, 24, 0.92)` | Lock / overlay panels |
| `--panel-strong` | `rgba(14, 22, 32, 0.96)` | Stronger panel fill (available) |
| `--line` | `rgba(122, 101, 52, 0.7)` | Default gold border |
| `--line-bright` | `#d7b56d` | Bright gold top edge / emphasis |
| `--cyan` | `#7fe7ef` | Energy accent, links, focus, active chips |
| `--cyan-deep` | `#00c4cc` | Deeper cyan (gradients, selection) |
| `--gold` | `#d7b56d` | Orokin gold labels / brand rule |
| `--gold-dim` | `#7a6534` | Dim gold / muted borders |
| `--danger` | `#e06b6b` | Errors / status failures |
| `--shadow` | `0 22px 60px rgba(0, 0, 0, 0.45)` | Panel elevation |
| `--radius` | `2px` | Global corner radius |

### Hardcoded companions (same palette)

| Hex / rgba | Where |
| --- | --- |
| `#f3efe4` | Brand mark text (warm off-white) |
| `#f4fbfb` | User bubble text |
| `#14100a` | Send button text on gold |
| `#0e141e` → `#080c12` → `#04070c` | Page background vertical gradient |
| `#080c12` | PWA `theme_color` / `background_color`, viewport `themeColor` |
| `#c9a85a` → `#8a6a2e` | Send button gold gradient |
| `#b8fbff`, `#4fd6e0`, `#0a3a42` | Ordis core radial gradient |
| `#e8fbff` | Ordis pupil fill |
| `rgba(0, 196, 204, 0.35)` | Text selection |
| `rgba(196, 208, 220, 0.45)` | Input placeholder |

### Semantic usage cheat sheet

| Use | Prefer |
| --- | --- |
| Body text | `--ink` |
| Muted / meta | `--ink-soft` |
| Links + focus rings | `--cyan` / `--cyan-deep` |
| Section labels (Transmission log, LLM fields) | `--gold` + display font |
| Borders | `--line` or `rgba(122, 101, 52, 0.55–0.7)` |
| Accent edge (assistant bubble left, compare top) | `--cyan` |
| Primary CTA | Gold gradient send button |
| Error | `--danger` |
| Active toggle chip | `--cyan` border + text (`.chipActive`) |

---

## Typography

Loaded via `next/font/google` in `layout.tsx`:

| Role | Family | CSS variables | Weights |
| --- | --- | --- | --- |
| Display / UI chrome | **Orbitron** | `--font-orbitron`, `--font-display` | default (variable) |
| Body / chat | **Rajdhani** | `--font-rajdhani`, `--font-body` | 400, 500, 600, 700 |

Fallbacks in tokens: Orbitron → Oxanium → sans; Rajdhani → Source Sans 3 → sans.

| Element | Font | Size / tracking |
| --- | --- | --- |
| Brand mark (`.brandMark`) | Display | `clamp(1.05rem, 3.2vw, 1.55rem)`, weight 700, `letter-spacing: 0.08em`, uppercase |
| Brand “Agent” span | Display | `--cyan` |
| Panel label | Display | `0.68rem`, weight 700, `letter-spacing: 0.18em`, uppercase, gold |
| Clear / LLM field labels | Display | ~`0.62–0.72rem`, uppercase, wide tracking |
| Send button | Display | weight 700, `letter-spacing: 0.08em`, uppercase |
| Ordis caption | Display | `clamp(0.62rem, 1.4vw, 0.72rem)`, weight 600, `letter-spacing: 0.14em`, uppercase |
| Chat bubbles | Body | inherit; `line-height: 1.45` |
| Chips | Body | `0.88rem`, weight 600 |
| Status line | Body | `0.82rem` |
| Meta (“Used: tools”) | Body | `0.75rem`, soft ink |

---

## Layout & spacing

### Shell (`.shell`)

- Width: `min(1120px, 100%)`, centered
- Height: `100dvh`, `overflow: hidden`
- Grid rows: `minmax(0, 25dvh)` (brand + Ordis) · `minmax(0, 1fr)` (chat) · `auto` (status)
- Gap: `0.55rem` (mobile `0.45rem`)
- Padding: `~0.55–1rem` + safe-area insets (`--safe-top` / `--safe-bottom`)

### Top zone

- Max height **25dvh** desktop, **22dvh** at `max-width: 600px`
- Brand header (centered) → Ordis center stage

### Chat panel (`.chatPanel`)

- Flex column; gold border with **brighter 2px top edge**
- Background: vertical dark gradient (`rgba(14,20,30)` → void)
- Contains: panel header → message scroller → suggestion chips → optional LLM panel / attach bar → composer

### Composer (`.composer`)

- Desktop: `auto 1fr auto` (attach · textarea · send)
- Mobile (`≤600px`): attach + textarea; send full-width on next row

### Breakpoints

| Query | Changes |
| --- | --- |
| `max-width: 600px` | Tighter shell padding; top zone 22dvh; compare columns stack; composer/send reflow |
| `max-height: 720px` | Slightly tighter brand rule margin |
| `prefers-reduced-motion: reduce` | Ordis animations disabled (static opacity left) |

---

## Surfaces & components

### Background (body)

1. Cyan radial (top center, ~14% opacity)
2. Gold radial (top-right, ~10%)
3. Cyan radial (bottom-left, ~6%)
4. Linear void gradient `#0e141e → #080c12 → #04070c`
5. Fixed `::before` grid: 32×32px cyan/gold hairlines at ~28% opacity, masked to center

### Brand header

- Title: `Warframe Build` + cyan `Agent`
- Gold horizontal rule (gradient fade ends, bright center), max-width `12rem`, height `2px`
- Tagline element exists but is **hidden** in CSS (`.tagline { display: none }`)

### Ordis stage

- Field size: `min(42vw, 150px)`, aspect-ratio 1, capped by `min(18dvh, 150px)`
- Moods (`data-mood`): `idle` | `thinking` | `speaking`
- Captions (from `lib/ordis.ts`): standing by / consulting / transmitting
- Speaking mood lasts **3400ms** after assistant reply
- SVG gradients: core cyan, facet gold→cyan, edge warm ivory→dim gold

### Message bubbles

| Kind | Classes | Look |
| --- | --- | --- |
| User | `.bubble.user` | Cyan gradient fill, cyan border, align end, max ~42rem |
| Assistant | `.bubble.assistant` | Dark fill, gold border, **2px cyan left edge**, stretch |
| Pending | assistant bubble | “Checking the latest intel…” |
| Compare | `.compareCol` | Two columns (≥600px), gold sides, cyan top edge, gold title |

Shared bubble props: `border-radius: 1px`, padding `0.75rem 0.9rem`, `white-space: pre-wrap`, enter animation `messageIn` 280ms.

### Chips (`.chip`)

- Sharp 1px radius, dark fill, dim gold border
- Hover/focus: lift `-1px`, cyan border/text
- Active toggles: `.chipActive` (cyan)
- Used for: AI / LLM / Online search + suggestion prompts

### Composer controls

| Control | Notes |
| --- | --- |
| Attach | 2.75×2.75rem square, dark fill, gold border → cyan on hover |
| Textarea | min 3rem / max 8rem, dark fill; focus = cyan border + `0 0 0 2px rgba(0,196,204,0.18)` |
| Send | Gold gradient CTA, dark text, display font; hover lift + brightness |
| Attach preview thumb | 4.5rem square, cyan-tinted border |

### LLM settings panel

- Dark strip under chips (`.llmPanel`), gold uppercase field labels, same input/send language as composer

### Password lock

- Centered `.lock` panel: `--panel` fill, gold border + bright top, gold display heading

### Scrollbar (messages)

- Thin; thumb `rgba(215, 181, 109, 0.45)` on dark track
- Suggestion row hides scrollbar

---

## Motion

| Name | Duration / easing | Used for |
| --- | --- | --- |
| `rise` | 480–860ms ease-out | Brand, stage, panel, composer entrance (staggered) |
| `messageIn` | 280ms ease-out | New bubbles |
| `stageIn` | 700ms cubic-bezier(0.22,1,0.36,1) | Ordis stage mount |
| `floatIdle` | 5.2s | Ordis bob |
| `floatThink` / `cubeTilt` / `ringExpand` | ~1.1–1.8s | Thinking mood |
| `speakBob` / `speechRipple` / `arcPulse` | ~0.45–1.05s | Speaking mood |
| Chip / send hover | 160ms | Border/color/transform |

Respect `prefers-reduced-motion` for Ordis (animations off).

---

## Icons & PWA

| Asset | Purpose |
| --- | --- |
| `ordis-icon.svg` | Favicon + PWA “any” icon (same gold/cyan cephalon language) |
| `favicon-32.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Raster sizes |
| Manifest | name “Warframe Build Agent”, short “WF Agent”, standalone, theme `#080c12` |
| Apple web app | `black-translucent` status bar, title “WF Build Agent” |

---

## Copy & chrome strings (UI surface)

Useful when matching voice without changing product docs:

- Panel label: **Transmission log**
- Pending: **Checking the latest intel…**
- Ordis idle / thinking / speaking captions (see Typography / Ordis stage)
- Toggle chips: **AI on/off**, **LLM / Ollama**, **Online search on/off**
- Status line modes: offline chatbot · `LLM on (Warframe advisor)` · `AI general agent` (+ model / Online)

---

## Implementation map (redesign checklist)

When restyling, touch these in order:

1. **Tokens** — `globals.css` `:root` (+ body gradients / grid)
2. **Fonts** — `layout.tsx` + `--font-*` wiring
3. **Shell / chat chrome** — `page.module.css` (brand, panel, bubbles, chips, composer)
4. **Ordis** — `OrdisStage.module.css` + SVG stops in `OrdisStage.tsx`
5. **PWA / icons** — `manifest.webmanifest`, `ordis-icon.svg`, PNG set, `themeColor` in `layout.tsx`
6. **Integrity** — `web/src/lib/ui-integrity.test.ts` asserts key labels/wiring strings still exist in `page.tsx`

Keep radius sharp and avoid turning the first viewport into a card dashboard unless you intentionally redesign that composition.
