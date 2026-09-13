---
name: Hindsight
description: Your trade history as a landscape you look back across, then interrogated until every claim points at a trade.
colors:
  void: "#050505"
  panel: "#0c0c0c"
  panel-deep: "#080808"
  white: "#f5f5f5"
  grey: "#8f8f8f"
  grey-deep: "#7d7d7d"
  loss: "#d2736a"
  won: "#cfcfcf"
  line: "rgba(255, 255, 255, 0.08)"
  line-strong: "rgba(255, 255, 255, 0.16)"
  scrollbar: "#262626"
  scrollbar-hover: "#3a3a3a"
typography:
  display:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6.4vw, 5.25rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.2vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  lead:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.4vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  small:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  figure:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    fontFeature: "tnum 1"
  diagram:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    fontFeature: "tnum 1"
  micro:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 400
rounded:
  chip: "6px"
  tile: "12px"
  card: "16px"
  panel: "20px"
  mark: "22px"
  pill: "999px"
spacing:
  gutter: "24px"
  panel-pad: "28px"
  panel-pad-wide: "40px"
  section: "160px"
components:
  button-pill:
    backgroundColor: "{colors.white}"
    textColor: "{colors.void}"
    rounded: "{rounded.pill}"
    padding: "12.8px 22.4px"
  button-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.02)"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "12.8px 22.4px"
  button-ghost-hover:
    backgroundColor: "rgba(255, 255, 255, 0.07)"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
  proof-chip:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  proof-chip-active:
    backgroundColor: "{colors.white}"
    textColor: "{colors.void}"
  input-pill:
    backgroundColor: "rgba(0, 0, 0, 0.5)"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
---

# Design System: Hindsight

## Overview

**North star: The Look Back.** A black room with one light above the centre. The first thing
a visitor sees is their trading history drawn as terrain — walls rising either side, a
valley floor that ripples with the real equity curve — and a lit mark sitting in the valley.
Everything after that is interrogation: the mechanism shown working, a real finding, and a
tool whose verdict can be clicked back down to the fills.

Mood: cinematic, calm, precise, slightly austere. Motion is slow and continuous rather than
bouncy; light does the emphasis, not colour.

**Anti-reference:** the trading-journal dashboard — rows of stat tiles, candlestick chrome,
green/red everywhere, accent colour per metric. Also refused: any light theme. Pinned
reference: the user's `hin.jpg`.

## Colors

Strategy: **Strict monochrome with one exception.** The whole surface is black, greys and
white. The single colour, `loss`, is confirmed by the user and appears only inside data —
a loss figure, a sell, a struck citation, a parse error. It never decorates.

| Token | Value | Role |
|---|---|---|
| `void` | `#050505` | Page ground |
| `panel` → `panel-deep` | `#0c0c0c` → `#080808` | Panel body, top to bottom |
| `white` | `#f5f5f5` | Primary text, primary action, active proof |
| `grey` | `#8f8f8f` | Secondary text, labels, leads |
| `grey-deep` | `#7d7d7d` | Dimmest grey permitted to carry text (4.7:1 on `void`) |
| `line` / `line-strong` | white at 8% / 16% | Borders and dividers |
| `loss` | `#d2736a` | Losses, sells, struck citations, errors — data only |
| `won` | `#cfcfcf` | The won segment in charts. Validated against `loss` on `panel`: CVD ΔE 19.6, normal ΔE 22.9 |
| `scrollbar` / `scrollbar-hover` | `#262626` / `#3a3a3a` | Scrollbar thumb |

Emphasis comes from brightness: white is the loudest thing on the page, followed by the
white glow around the primary pill and the active proof chip.

## Typography

- **Onest** — all prose and headings. Headings at weight 600, tracked `-0.035em`, line
  height 1.02, always `text-wrap: balance`. The hero's second line drops to 55% white rather
  than changing weight or face.
- **JetBrains Mono** — every measured or identifying thing: trade and position IDs, prices,
  quantities, timestamps, step numerals. Tabular figures via `.tnum`.

Ramp as built: display `clamp(2.5rem, 6.4vw, 5.25rem)` → section headline
`clamp(2rem, 4.2vw, 3.25rem)` → title `1.75rem` → lead `clamp(1rem, 1.4vw, 1.1875rem)` →
body `0.9375rem` → small `0.875rem` → figure `0.75rem` → diagram `11px` (mono inside
diagrams and fill lists) → micro `10px` (captions only).

Sections are headed by the heading alone. No eyebrow, pill label, or kicker sits above a
heading, even though the reference uses them.

## Layout

- **Story first, tool below**, confirmed by the user: hero → ticker → what it is → how it
  works → a real finding → the tool (`#run`) → footer. Hero actions anchor-scroll to `#how`
  and `#run`; there is no navigation and no other route.
- Hero is full viewport height (`100svh`). Content column is `max-width: 72rem` with `24px`
  gutters. Section headings are centred; panel content is left-aligned.
- Sections are `160px` apart on desktop (`128px` mobile). Panel padding `28px`, `40px` wide.
- How-it-works is a 4 / 2 / 1 column grid of equal-height (`26rem`) panels.
- Desktop-first; below `sm` grids stack and the positions table scrolls horizontally inside
  its own panel.

## Elevation & Depth

**Lit from above.** Depth is light, not lift:

- Panels carry a radial white wash from the top edge, an inset 1px top highlight, and a long
  soft drop shadow (`0 30px 60px -30px`).
- The centre mark tile glows and slowly breathes; a blurred, clipped trapezoid **beam** falls
  from it. The same beam sits behind the report verdict and the showcase quote.
- Drifting **dust** (tiled CSS radial points) hangs in panels that carry light.
- A soft white radial glow crowns the hero; a black fade closes its bottom edge.

No hard offset shadows. No colour in any glow.

## Shapes

Soft and consistent: pills (`999px`) for every action, chip, and the question input;
`20px` panels; `22px` for the mark tile; `16px` for the inner checklist cards; `12px` for
icon tiles; `6px` for the small chips inside diagrams. Borders are 1px at low white alpha.

## Components

- **button-pill** — solid white on void, with a white outer glow that intensifies and lifts
  1px on hover. One per region: *Run the post-mortem*, *Upload your CSV*, *Analyse*.
- **button-ghost** — transparent pill with a `line-strong` border, brightening on hover.
- **panel** — the universal container, described under Elevation. On hover a 1px highlight
  travels across its top edge.
- **proof-chip** — mono ID in a pill. Active state inverts to white on void with a glow and
  `aria-pressed`. Clicking one highlights and scrolls to its position row.
- **Positions table** — lives inside a panel; cited rows get a white wash plus a 2px inset
  white bar at the left edge plus a bolder white ID, so proof never relies on colour alone.
- **Terrain** (`src/components/terrain.tsx`) — canvas line field, 58 depth rows × 180
  samples, perspective-fanned, walls rising to the edges, valley floor rippling with the
  real cumulative P&L, slow drift, faint pointer parallax. Pauses off-screen; draws a single
  still frame under reduced motion.
- **How-it-works diagrams** (`src/components/how-it-works.tsx`) — each panel runs a working
  diagram built from real sample data: a scrolling fills feed, T0014–T0021 gathering into
  P05, figures counting in with a winner/loser bar comparison, and citations lighting in
  sequence while a nonexistent `P99` is struck.
- **Replay** (`src/components/replay-view.tsx`) — one card per rule, set as a headline dollar
  figure rather than a chart: what the rule would have saved (white) or cost (`loss`), the
  before → after in mono, and the affected positions as proof chips. A rule waiting on market
  data renders dashed, with a pulsing dot and the reason in plain words.
- **Market context** — five Fear & Greed bands as thin horizontal stacked bars (`won` then
  `loss`, 2px gap, 4px rounded ends), counts direct-labelled, legend present, a hover/focus
  tooltip on every row, and a "View as table" toggle. The data source is always named.
- **Icons** — drawn SVG, single 1.5px stroke on a 16-unit grid, plus the Hindsight mark: an
  arc turning back on itself around a fixed point.
- **Browser surfaces** — white text selection, white caret, 2px white focus ring at 3px
  offset, thin dark rounded scrollbar.

### Motion

Slow and continuous. Exponential ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`) throughout.

- Terrain drift and parallax (canvas, continuous).
- Mark tile breathe (5s) and dust drift (26s).
- Ticker marquee (48s) of measured sample figures.
- Scroll-driven reveal via `animation-timeline: view()` — rise 36px with an 8px blur. Content
  stays visible where the feature is unsupported.
- The report verdict resolves from a 24px blur over 1.4s.
- The analysing state is a travelling highlight on a hairline plus a pulsing dot.
- **Smooth scroll is Lenis** (`src/components/smooth-scroll.tsx`, `lerp 0.085`). It publishes
  `--scroll` and `--progress` on `<html>` every frame, and scroll-linked motion is written
  in CSS against those: a 1px progress hairline at the top of the viewport, and hero
  parallax in three depths — the copy rises and fades fastest, the mark sinks back into its
  valley, the terrain barely moves. Anchor links and the jump to a cited position row glide
  through `lenis.scrollTo`. Native `scroll-behavior: smooth` is deliberately absent.

Every animation is disabled under `prefers-reduced-motion`.

## Do's and Don'ts

**Do**

- Put emphasis in light: brightness, glow, the beam.
- Keep `loss` inside data.
- Set every ID and figure in mono with tabular numerals.
- Build graphics from the user's real data wherever the product has it.
- Mark state in at least two channels.

**Don't**

- Don't add a second colour, a gradient in colour, or gradient text.
- Don't put an eyebrow, pill label, or kicker above a heading.
- Don't use a logo strip or any brand, customer, or partner mark — there are none to claim.
- Don't add a light theme.
- Don't animate on a spring or with bounce.
- Don't let a diagram show a number the pipeline did not produce.
