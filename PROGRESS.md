# Progress

Claude Code: update this at the end of every working session. Keep it short and honest —
its only job is letting the next session resume without re-reading the codebase.

## Status

**Day:** 2 / 12 (Sept 10 2026)
**Deployed:** no
**Demo URL:** —
**Day-7 gate:** on track — day 7 falls Sept 16, ingest done on day 1

## Built

- [x] Ingest — CSV → normalised, validated trade list; sample generator; renders
- [x] Analyse — positions + computed facts + Gemini pass, Zod-validated (untested live: no key yet)
- [~] Report — renders patterns, evidence ids and checklist; not designed yet
- [ ] Deployed, link verified in a private window

Day 1 detail:

- `scripts/gen-trades.ts` — seeded synthetic history, 61 trades / 7 symbols, deliberately
  containing the target patterns (winners cut ~+4%, losers held to ~-12%, averaging down,
  a revenge trade after a big loss, losses clustered in tech-adjacent symbols).
- `src/lib/trades.ts` — PapaParse + Zod. Header aliases, messy numbers, missing id/fee all
  normalise; bad rows are reported per-row, never silently dropped.
- `src/app/page.tsx` — upload or "use sample history" → summary tiles + trade table +
  visible parse errors.
- `scripts/check-trades.ts` — assert-based parser self-check (`npm run check`).

Day 2 detail:

- `buildPositions` in `src/lib/trades.ts` — fills → round-trip positions (avg entry, exit,
  realised PnL incl. fees, adds-down count, hold hours, constituent trade ids).
- `src/lib/analysis.ts` — every figure the report may use is computed here in code:
  win rate, avg win/loss %, hold times, averaged-down group, revenge trades, per-symbol
  PnL, worst positions. The model narrates these; it never produces a number.
- `src/app/api/analyse/route.ts` — server-side Gemini call, JSON Schema generated from the
  Zod report schema, response re-validated with Zod, then `enforceCitations` strips any id
  that is not real and drops patterns left with no evidence.
- Sample facts now tell the intended story: 71% win rate but net -$893; winners +4.1% held
  5.9h vs losers -14.4% held 100h; 5 averaged-down positions, all losers, -$1,382 between
  them; 3 revenge trades; losses concentrated in MSTR/NVDA.

## Not built / known broken

- **The live model call has never run.** No `GEMINI_API_KEY` on the machine yet, so the
  request/response shape against `/v1beta/interactions` is written from the docs and is
  unverified. Everything either side of it (positions, facts, Zod validation, citation
  guard) is covered by `npm run check`.
- Report view is functional, not designed. Evidence ids are shown but not yet linked to
  rows in the trade table. Day 3-4.
- No shadcn/ui yet — plain Tailwind. Add on the polish day if it earns its place.

## Problems hit and how they were fixed

- Started on Claude, switched to Gemini's free tier at the user's request — the provider
  lives in one file, so the swap touched only `route.ts` and removed `@anthropic-ai/sdk`.
- The synthetic generator claimed a revenge-trade pattern the detector could never see:
  it stepped the clock 6-60h before the next entry, so the "straight back in" trade never
  landed inside the 3h window. Fixed the generator, not the detector.
- `create-next-app` refuses a project directory named `BITGET HINGESIGHT` (npm naming
  rules: no capitals, no spaces). Scaffolded into `F:\tmp\hindsight` and moved the files
  into the repo root.
- That move overwrote the project `CLAUDE.md` with the scaffold's own one-line pointer to
  `AGENTS.md`. Restored from the loaded copy, with `@AGENTS.md` appended so both load.
- The four hackathon docs were at the repo root while `CLAUDE.md` referenced `docs/`.
  Moved them into `docs/`.

## Stack

- Frameworks: Next.js 16.3.4 (App Router, Turbopack), React 19.2, TypeScript 5,
  Tailwind CSS 4.
- Models used and what for: **Gemini 3.8 Flash** (free tier) generates the report from
  pre-computed facts, behind a server-side API route with a JSON Schema constraint.
  **Claude Opus 5** (Claude Code) writes the code.
- APIs / Skills integrated: none yet. `bitget-signal` `technical-analysis` is optional
  market context — only after the core loop works.

## Validation data

- Testers recruited: 0
- Testers run: 0
- "Told me something I didn't know": _ / _
- Notes: campus recruiting starts once the report view renders (target day 4).

## Next session starts with

Add `GEMINI_API_KEY` to `.env.local`, run the analyse call end to end against the sample
history, and fix whatever the real response shape breaks. Then the day 3-4 report view.
