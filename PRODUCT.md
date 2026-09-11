# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Retail traders under roughly $10k account size, 5-20 trades a month, discretionary,
primarily crypto with some tokenized equity exposure. **They have no journalling habit and
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

A single page, opened once. The user loads a CSV (or the bundled sample), types a question
about their own trading, waits for one analysis pass, and reads the result. There is no
return visit, no saved state, no account. Judges will run this exact path on a laptop from
a public link.

## Capabilities and Constraints

- **Three functions only: ingest → analyse → report.** Out of scope and not to be added
  without an explicit request: live price feeds, charts, chat, auth, multi-user, broker
  integration, order placement.
- **The tool must never place an order.** Read-only, always.
- Single page, no navigation, no routes beyond the one API endpoint. A stranger with no
  login must be able to use everything.
- No database. In-memory session state only.
- Next.js 16 (App Router) + TypeScript + Tailwind 4, deployed on Vercel. PapaParse for
  CSV, Zod validating all structured model output.
- Analysis runs server-side against Gemini's free tier, whose request quota is a
  per-minute bucket held separately per model; the route falls through several models.
  One analysis takes 15-25 seconds — the waiting state is a real design surface, not an
  edge case.
- Desktop-first is acceptable. Mobile should degrade gracefully but need not be a
  designed experience.

## Brand Commitments

- The name **Hindsight** is fixed.
- Visual direction pinned by the user via reference image `JOU.jpg`: near-black ground,
  warm gold accent, oversized display type, thin vertical column rules, generous negative
  space, small mono labels, editorial layering.
- Voice: second person, plain language, no hedging, no encouragement, no disclaimers. The
  report talks about the trader's decisions, never about the market.

## Evidence on Hand

- `public/sample-trades.csv` — 61 seeded synthetic fills across 7 symbols, deterministic,
  containing real instances of every pattern the report claims to find.
- Real computed output from that sample: 24 closed positions, 70.8% win rate, net -$893,
  winners +4.1% held 5.9h vs losers -14.35% held 100h, 5 averaged-down positions all
  losers costing -$1,382, 3 revenge trades.
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
