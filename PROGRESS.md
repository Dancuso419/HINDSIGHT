# Progress

Claude Code: update this at the end of every working session. Keep it short and honest —
its only job is letting the next session resume without re-reading the codebase.

## Status

**Day:** 1 / 12 (Sept 10 2026)
**Deployed:** no
**Demo URL:** —
**Day-7 gate:** on track — day 7 falls Sept 16, ingest done on day 1

## Built

- [x] Ingest — CSV → normalised, validated trade list; sample generator; renders
- [ ] Analyse
- [ ] Report
- [ ] Deployed, link verified in a private window

Day 1 detail:

- `scripts/gen-trades.ts` — seeded synthetic history, 68 trades / 6 symbols, deliberately
  containing the target patterns (winners cut ~+4%, losers held to ~-12%, averaging down,
  a revenge trade after a big loss, losses clustered in tech-adjacent symbols).
- `src/lib/trades.ts` — PapaParse + Zod. Header aliases, messy numbers, missing id/fee all
  normalise; bad rows are reported per-row, never silently dropped.
- `src/app/page.tsx` — upload or "use sample history" → summary tiles + trade table +
  visible parse errors.
- `scripts/check-trades.ts` — assert-based parser self-check (`npm run check`).

## Not built / known broken

- No position grouping yet (round-trip buys → sell). The analyse pass needs it; it is the
  first thing day 2 builds.
- No LLM pass, no report, no checklist.
- No shadcn/ui yet — plain Tailwind. Add on the polish day if it earns its place.
- Styling is functional, not designed. Day 6.

## Problems hit and how they were fixed

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
- Models used and what for: none wired yet. Claude (Opus 5) writes the code; the in-app
  analysis pass lands day 2 behind a server-side API route.
- APIs / Skills integrated: none yet. `bitget-signal` `technical-analysis` is optional
  market context — only after the core loop works.

## Validation data

- Testers recruited: 0
- Testers run: 0
- "Told me something I didn't know": _ / _
- Notes: campus recruiting starts once the report view renders (target day 4).

## Next session starts with

Position grouping in `src/lib/trades.ts` (FIFO round trips + realised PnL per position),
then the day-2 LLM tagging pass behind an API route with Zod-validated output.
