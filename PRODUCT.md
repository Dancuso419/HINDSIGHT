# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Retail traders under roughly $10k account size, 5-20 trades a month, discretionary,
trading **tokenized US stocks** — the hackathon's stated focus ("AI × US stock trading,
including tokenized US stocks / related contract scenarios"), confirmed by the user on
2026-09-14 — with tech-adjacent names as the typical concentration. **They have no journalling habit and
will not acquire one** — that is the defining trait, not an incidental one. They arrive
with a CSV exported from an exchange and a nagging suspicion that they keep making the
same mistake, but nothing that would tell them what it is.

Secondary audience for the current build: hackathon judges evaluating the entry on a
laptop, who must be able to open a link with no login and follow one complete research
task end to end.

## Product Purpose

Turn a raw trade log into a behavioural post-mortem: the decision patterns this person
repeats, the specific trades that prove each one, and a checklist targeting their own
recurring errors. Success is a trader saying it told them something they did not already
know — and being able to verify it by looking at the trades behind the claim.

## Positioning

A **one-shot post-mortem for a trader with no journalling habit**: one CSV, one report, no
account, nothing to maintain. Every claim cites specific trade IDs, and the model cannot
invent a figure — all numbers are computed in code and handed to the model as fixed facts;
citations that do not match real trades are stripped before render.

The incumbent category (TradeZella, TraderSync, Trademetria, TradeBB, Trade Journal AI,
Tradervue) is built on sustained journalling: link a broker, tag trades as you go, keep a
habit. That mechanism structurally cannot serve a user who will not keep the habit, and
those tools let the model narrate freely over the data rather than constraining it to
verifiable arithmetic. Hindsight is not a new category; it is a different mechanism for a
user the category assumes away.

## Operating Context

A single page, opened once. The user loads a CSV, a pasted table or screenshots (or the bundled sample), types a question
about their own trading, waits for one analysis pass, and reads the result. There is no
return visit, no saved state, no account. Judges will run this exact path on a laptop from
a public link.

## Capabilities and Constraints

- **Three functions only: ingest → analyse → report.** Out of scope and not to be added
  without an explicit request: live price feeds, charts, chat, auth, multi-user, broker
  integration, order placement.
- **The tool must never place an order.** Read-only, always.
- Single page, no navigation. Two API endpoints: `/api/analyse` and `/api/extract` (reading
  trades from screenshots). A stranger with no login must be able to use everything.
- **Three ways in**, added because many trading apps (especially mobile) cannot export CSV:
  upload a CSV, paste a copied table, or screenshots of the order history. Screenshot rows
  are always shown for review and correction before analysis, and a year that is not visible
  is supplied by the trader, never guessed.
- No database. In-memory session state only.
- Next.js 16 (App Router) + TypeScript + Tailwind 4, deployed on Vercel. PapaParse for
  CSV, Zod validating all structured model output.
- Analysis runs server-side against Gemini's free tier, whose request quota is a
  per-minute bucket held separately per model; the route falls through several models.
  One analysis takes 25-60 seconds — the waiting state is a real design surface, not an
  edge case.
- Desktop-first is acceptable. Mobile should degrade gracefully but need not be a
  designed experience.

## Brand Commitments

- The name **Hindsight** is fixed.
- Visual direction pinned by the user via reference image `hin.jpg` (supersedes the earlier
  `JOU.jpg` gold direction): pure black ground, strictly monochrome greys and white, flowing
  line-field wave surfaces in the hero with a glowing centre mark and light beam, centred
  headline with a white pill action, soft dark rounded panels each carrying its own
  graphic, particles and depth. The user asked for motion, graphics and effects.
- Colour exception confirmed by the user: losses may use a single muted red inside the data;
  everything else stays monochrome.
- Page structure confirmed by the user: story first (hero, how it works, a real finding),
  the working tool below it.
- Voice: second person, plain language, no hedging, no encouragement, no disclaimers. The
  report talks about the trader's decisions, never about the market.

## Evidence on Hand

- `public/sample-trades.csv` — 116 fills from a **synthetic trader on real US stock prices**
  (`data/prices.json`, daily candles from Yahoo Finance). Every fill is on a real trading day
  inside that day's real high-low range. The trader's habits are fixed rules applied to
  every stock (`scripts/gen-trades.ts`); outcomes emerge from the real price path.
- Real computed output from that sample: 41 closed positions, 78% win rate, net −$1,216.51;
  tech-adjacent names −$1,408.89 vs everything else +$192.38; winners +3.9% held 308h vs
  losers −9.43% held 699h; 2 revenge trades (27 and 116 minutes after a loss, ~4× median
  size) lost $1,497.36.
- Replays on that sample: never averaging down +$307.96; waiting 3h after a loss
  +$1,445.52; a −5% stop-loss −$87.64 (would have cost money).
- **No real user data and no testers yet.** Validation is planned (6-8 campus testers),
  not performed. Nothing may present estimated or target figures as observed.

## Product Principles

1. **A claim without a citation does not ship.** Every figure traces to computed facts;
   every pattern traces to trade IDs the user can click.
2. **The graded moment is click-to-evidence.** Clicking a trade ID in a claim must reveal
   the fills behind it. Whatever else changes, that survives.
3. **Depth on one flow beats breadth.** If a change does not improve "load history → see
   my recurring mistakes → get a checklist", it does not belong.
4. **Honest about what is not known.** No fabricated confidence, in the report or about
   the product's own validation.

## Accessibility & Inclusion

No product-specific standard established. Baseline: keyboard-operable controls, visible
focus, and evidence highlighting that does not rely on colour alone.
