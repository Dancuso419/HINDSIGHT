---
name: Hindsight
description: A verdict on your own trading, set at poster scale and provable on contact.
colors:
  ink: "#121110"
  ink-raised: "#1a1815"
  gold: "#e8b44c"
  gold-deep: "#8a6a25"
  bone: "#f3efe6"
  bone-dim: "#a9a197"
  clay: "#ee7a5c"
  sage: "#a9be8c"
  rule: "rgba(243, 239, 230, 0.09)"
  rule-gold: "rgba(232, 180, 76, 0.28)"
typography:
  display:
    fontFamily: "Archivo Black, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 7.5vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Archivo Black, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  figure:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "1.75rem"
    fontWeight: 400
    fontFeature: "tnum 1"
  label:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    letterSpacing: "0.16em"
rounded:
  none: "0px"
spacing:
  gutter: "24px"
  gutter-wide: "48px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    rounded: "{rounded.none}"
  button-quiet-hover:
    backgroundColor: "transparent"
    textColor: "{colors.gold}"
  proof-chip:
    backgroundColor: "transparent"
    textColor: "{colors.gold}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 8px"
  proof-chip-active:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    rounded: "{rounded.none}"
    padding: "0 0 12px 0"
---

# Design System: Hindsight

## Overview

**North star: The Verdict Sheet.** A single lamp-lit page that states a finding at poster
scale and then lets you audit it line by line — closer to a printed report card than to a
trading dashboard. The gold carries authority, not decoration; every figure is set as a
measurement.

Mood: sober, direct, unhurried, faintly severe. The interface never congratulates and never
hedges, and the visual system follows: no badges, no progress rings, no celebratory colour.

**Anti-reference:** the trading-tool dashboard — grids of equal cards, stat tiles with big
numbers and small labels, accent colours per metric, chart chrome standing in for insight.
This surface refuses that arrangement. Also refused: light mode. The use scene is one
person, one laptop, reviewing losses alone; the room is dark and the page matches it.

## Colors

Strategy: **Restrained-committed.** A single warm near-black ground, one gold, one bone
text colour. Gold is rationed — it means *authority or proof*, never decoration. Clay and
sage exist only to carry sign on a number.

| Token | Value | Character | Role |
|---|---|---|---|
| `ink` | `#121110` | Warm lamp-off black | Page ground. There is no light variant. |
| `ink-raised` | `#1a1815` | A shade nearer the lamp | Rare raised fill |
| `gold` | `#e8b44c` | Struck brass | The verdict, proof marks, primary action |
| `gold-deep` | `#8a6a25` | Tarnished brass | Rules, scrollbar, checkbox strokes, fill IDs |
| `bone` | `#f3efe6` | Warm paper white | Primary text |
| `bone-dim` | `#a9a197` | Ash | Secondary text, labels, quiet figures |
| `clay` | `#ee7a5c` | Fired clay | Negative P&L, sells, parse errors |
| `sage` | `#a9be8c` | Dry sage | Positive P&L, buys |

Gain/loss never uses signal green or signal red. Clay and sage are muted enough to sit in
a body of text without shouting, which matters because most of this page's numbers are
losses and a wall of alarm red would read as decoration.

**Colour is never the only channel.** A cited position carries three marks at once: a gold
rule at the row head, the ID in gold at heavier weight, and a faint gold wash on the row.

## Typography

Three faces, each with one job.

- **Archivo Black** — display only. The hero verdict, section headings, the question label.
  Set tight (`-0.035em`, `line-height: 0.92`) and large; it is the voice of the finding.
- **Archivo** — body prose. Findings and checklist rules, measure capped at 68–72ch.
- **Azeret Mono** — every measured thing: trade IDs, prices, quantities, percentages,
  timestamps, and the small tracked labels. Tabular figures via `.tnum` so columns align.

Monospace here is data, not costume: if a string is a measurement or an identifier it is
mono, and if it is prose it is not.

Ramp as built: display `clamp(2.5rem, 7.5vw, 6rem)` → headline `2rem` → title `1.25rem` →
body `0.9375rem` → label `0.6875rem`. Steps are far apart on purpose; there is no
mid-weight filler tier.

## Layout

- One centred column, `max-width: 1180px`, with a **hairline rule down each side** — the
  page reads as a framed sheet rather than a full-bleed app.
- Gutters: `24px` mobile, `48px` from `sm`.
- Sections are separated by a rule and roughly `80px` of space, always with more space
  above a heading than below it.
- Data tables are `border-collapse` with horizontal hairlines only. No vertical grid lines,
  no zebra striping, no container around the table.
- Desktop-first. Below `sm` the composition stacks and tables scroll horizontally inside
  their own overflow container; the page body never scrolls sideways.

## Elevation & Depth

**Flat by rule.** There are no shadows anywhere in this system, and adding one would break
it. Depth is expressed by tonal separation (`ink` vs `ink-raised`), by hairline rules, and
by type weight. A lifted card in this world would read as a different product.

## Shapes

**Radius is zero, everywhere.** Buttons, inputs, chips and tables are all square. The
squareness is the identity — it is what makes the page read as a printed sheet. Inputs are
underlines, not boxes: a single `rule-gold` bottom border that turns solid `gold` on focus.

Borders are 1px hairlines at low alpha. The only heavier rule is the 2px clay bar marking
a parse error and the 2px gold bar marking a cited row.

## Components

- **button-primary** — solid gold, ink text, square, with a drawn arrow. Exactly one per
  view: *Analyse*. Hover drops opacity to 85%; disabled to 40%.
- **button-quiet** — an icon and a label, no border, no fill. Bone text going gold on hover.
  All loading controls use this.
- **proof-chip** — square mono chip, gold on transparent inside a `rule-gold` border.
  Active state inverts to solid gold on ink at semibold. Carries `aria-pressed`.
- **input-underline** — transparent, bottom hairline only, large text, gold caret.
- **Icons** are drawn SVG on a 16-unit grid at a single 1.5px stroke (`src/components/icons.tsx`).
  Never glyphs, never emoji.
- **Browser surfaces are themed**: gold text selection, gold caret, a thin gold-deep
  scrollbar inset against the ground, and a 2px gold focus ring at 2px offset.

Motion is one authored moment: the verdict arrives via a left-to-right `clip-path` strike
(900ms, `cubic-bezier(0.16, 1, 0.3, 1)`), as if printed. The analysing state reuses that
keyframe as a travelling hairline. Both respect `prefers-reduced-motion`. Nothing else on
the page animates except 150–200ms colour transitions.

## Do's and Don'ts

**Do**

- Spend gold on proof and authority only. If it isn't a verdict, a citation, or the primary
  action, it isn't gold.
- Set every figure in mono with tabular numerals.
- Divide with rules and space.
- Mark state in at least two channels so colour is never load-bearing alone.

**Don't**

- Don't add cards, tiles, or a stat-tile row. The ledger strip is rule-separated values, and
  turning it into boxes is the failure mode this system was designed against.
- Don't add a second accent colour, a gradient, or gradient text.
- Don't round a corner.
- Don't add a shadow.
- Don't use an eyebrow or kicker above a heading.
- Don't introduce a light theme.
