# SOLUM — Packaging Inserts Design Brief
## For Manus — Two HTML Artefacts

> All brand specs are locked. Do not deviate from typography, colour, or tone.
> Deliver each artefact as a standalone, print-ready HTML file.
> Reference file for design language: `solum-ritual-card-full.html`
>
> **IMPORTANT:** Neither insert contains ritual steps or product instructions.
> All instructional content lives at bysolum.co.uk. The inserts drive the customer there.
> This means we can update the ritual on the website without ever reprinting.

---

## BRAND SPECS (LOCKED)

### Typography
| Role | Font | Weight | Notes |
|---|---|---|---|
| Wordmark | Bebas Neue | — | Always uppercase, letterspacing 0.15em |
| Headings | Barlow Condensed | 700 | |
| Subheadings / UI | Barlow Condensed | 600 | |
| Body copy | Barlow Condensed | 300 | |
| Micro / labels | Barlow Condensed | 500 | |

Google Fonts import: `https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap`

### Colour Palette
```
--black:  #08090B   /* Primary ground */
--char:   #181C24   /* UI surface */
--bone:   #F0ECE2   /* Primary type */
--stone:  #6A7380   /* Secondary type */
--blue:   #2E6DA4   /* Primary accent */
--blit:   #4A8FC7   /* Highlight */
--bdim:   #1A4A78   /* Dark accent */
--gold:   #C8A96E   /* Weekly ritual accent */
```

### Brand Rules
- Never lowercase the wordmark SOLUM
- Never use orange, amber, yellow, or green
- No gradients except subtle radial glows on dark backgrounds
- Minimal. No decoration for decoration's sake.
- Tone: direct, confident, no fluff

---

## DELIVERABLE 1 — FOUNDER CARD

### Format
- **Physical size:** A6 portrait — 105mm × 148mm
- **Print spec:** 400gsm matte, double-sided
- **HTML canvas:** Render at 2× for screen preview. Show front and back as two stacked cards on a dark `#0d0f12` background, labelled `FRONT` and `BACK` in 7px uppercase stone text above each.

---

### FRONT — Founder Story

**Layout (top to bottom):**

**1. Photo area** — top 45% of card. Full-bleed placeholder for a portrait photograph. Render as a `#181C24` rectangle with a subtle radial glow centred (steel blue, very faint: `rgba(46,109,164,0.08)`) and the text `FOUNDER PHOTO` centred in `#6A7380`, 8px, letterspacing 4px, uppercase. No border. No rounded corners.

**2. Accent rule** — 2px full-width, solid `#2E6DA4`.

**3. Copy block** — bottom 55%, background `#08090B`, padding 20px 22px 22px.

- Eyebrow: `SOLUM · A NOTE FROM THE FOUNDER`
  Barlow Condensed 600, 6px, letterspacing 5px, uppercase, `#4A8FC7`, margin-bottom 14px.

- Body copy — Barlow Condensed 300, 10px, line-height 1.75, `#F0ECE2`, margin-bottom 20px:

  > I built SOLUM because I was showering every day and still had dry skin, a rough back, and a scalp I'd never properly looked after. Not because I wasn't trying — because nobody had ever built men a system worth following.
  >
  > Everything in this box was sourced for a reason. The mitt is Korean bathhouse technique. The clay is from the Atlas Mountains. The lotion has a three-minute window after towelling — most men have never heard of it.
  >
  > This is what I wish I'd had ten years ago.

- Signature — Barlow Condensed 500, 11px, letterspacing 1px, `#F0ECE2`:
  `— Harsha Dandi`
  Below on new line: `Founder, SOLUM` — 8px, letterspacing 3px, uppercase, `#6A7380`.

---

### BACK — QR + Brand

This side has one job: get the customer to bysolum.co.uk/ritual. Everything else is secondary.

**Background:** `#08090B`. Padding 28px 26px.

**Top — wordmark block:**
- SOLUM — Bebas Neue, 32px, letterspacing 0.15em, `#F0ECE2`.
- Below: `YOUR BODY. DONE RIGHT.` — Barlow Condensed 600, 8px, letterspacing 5px, uppercase, `#2E6DA4`, margin-top 4px.

**Full-width rule** — 1px, `rgba(240,236,226,0.07)`, margin 20px 0.

**Centre — QR block (the dominant element):**
- Direction line above QR: `YOUR RITUAL IS INSIDE →` — Barlow Condensed 600, 8px, letterspacing 4px, uppercase, `#F0ECE2`, margin-bottom 16px, centred.
- QR placeholder: 88px × 88px, centred. Render as a `#181C24` square, 1px border `#2E6DA4`, with a simple QR-pattern SVG inside (corner squares + dot fill — does not need to be scannable, this is a mockup). No label below the QR itself.
- URL below QR: `bysolum.co.uk/ritual` — Barlow Condensed 500, 10px, letterspacing 2px, `#4A8FC7`, margin-top 12px, centred.

**Full-width rule** — same as above, margin 20px 0.

**Bottom — origin provenance (brand interest, not instruction):**
Four origin chips in a flex row, centred, gap 10px:
- Each chip: flag emoji + country name — 7px, letterspacing 2px, uppercase, `#6A7380`.
- `🇬🇧 UK` · `🇲🇦 Morocco` · `🇰🇷 Korea` · `🇹🇷 Turkey`

---

## DELIVERABLE 2 — BOX LID INTERIOR PANEL

### Context
Printed on the **inside face of the magnetic box lid** — the first surface the customer sees on opening. No instructions here. This is a brand moment and a single strong call to action: scan to get your ritual.

### Format
- **Physical size:** 270mm × 180mm landscape (15mm margin inside the A4 lid face)
- **HTML canvas:** Render at accurate proportions on `#0d0f12` background with a faint `box-shadow`. No label needed.
- **Orientation:** Landscape

---

### Layout

**Background:** `#08090B`. Padding 36px 44px.

The panel is divided into **two zones** — left brand, right QR — separated by a 1px vertical rule in `rgba(46,109,164,0.15)`.

---

**LEFT ZONE — Brand (flex: 1)**

Vertically centred content. Padding-right 44px.

1. Eyebrow: `MEN'S BODY RITUAL` — Barlow Condensed 600, 8px, letterspacing 6px, uppercase, `#2E6DA4`, margin-bottom 16px.

2. Headline (two lines): Bebas Neue, 52px, letterspacing 0.04em, line-height 0.95, `#F0ECE2`:
   ```
   YOUR BODY.
   DONE RIGHT.
   ```

3. Rule: 40px wide, 2px, `#2E6DA4`, margin 20px 0.

4. Body: Barlow Condensed 300, 11px, line-height 1.7, `#6A7380`, max-width 260px:
   > Sourced from the UK, Morocco, Korea, and Turkey. Numbered in order. Built for daily use. Everything you need, nothing you don't.

5. Origin chips — flex row, gap 10px, margin-top 16px:
   `🇬🇧` `🇲🇦` `🇰🇷` `🇹🇷` — each flag emoji, 14px, spaced with a `·` separator in `#2E6DA4` between them.

---

**RIGHT ZONE — QR Call to Action (flex: 0 0 auto, width ~200px)**

Vertically centred. Padding-left 44px.

1. Direction line: `YOUR RITUAL GUIDE` — Barlow Condensed 600, 8px, letterspacing 5px, uppercase, `#F0ECE2`, margin-bottom 4px, centred.

2. Sub-line: `SCAN TO GET STARTED` — Barlow Condensed 300, 8px, letterspacing 3px, uppercase, `#6A7380`, margin-bottom 20px, centred.

3. QR placeholder: 110px × 110px, centred. Same style as card back — `#181C24` fill, 1px border `#2E6DA4`, QR-pattern SVG inside.

4. URL below: `bysolum.co.uk/ritual` — Barlow Condensed 500, 10px, letterspacing 2px, `#4A8FC7`, margin-top 14px, centred.

5. Micro note below URL: `DAILY + WEEKLY RITUAL · VIDEO GUIDES · TIPS` — 6px, letterspacing 3px, uppercase, `#6A7380`, margin-top 6px, centred.

---

**Bottom strip** (full width, absolute bottom, padding-bottom 20px):
- Centred: `SOLUM` — Bebas Neue, 11px, letterspacing 0.2em, `rgba(240,236,226,0.12)`. Purely decorative watermark treatment.

---

## OUTPUT REQUIREMENTS

- Two separate HTML files: `solum-founder-card.html` and `solum-box-lid-insert.html`
- Each file is self-contained (no external dependencies except Google Fonts)
- No JavaScript required
- No lorem ipsum — use exact copy from this brief
- Dark `#0d0f12` page background for screen preview
- No ritual steps, no product instructions, no numbered sequences anywhere in either file

---

_SOLUM · Internal Use Only · bysolum.co.uk_
