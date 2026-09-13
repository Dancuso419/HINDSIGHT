# Progress

Claude Code: update this at the end of every working session. Keep it short and honest —
its only job is letting the next session resume without re-reading the codebase.

## Status

**Day:** 6 / 12 (Sept 13 2026)
**Deployed:** no
**Demo URL:** —
**Day-7 gate:** on track — day 7 falls Sept 16, ingest done on day 1

## Built

- [x] Ingest — CSV → normalised, validated trade list; sample generator; renders
- [x] Analyse — positions + computed facts + Gemini pass, Zod-validated, verified live
- [x] Report — patterns, clickable evidence, expandable fills, checklist
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

Day 3-4 detail:

- `src/components/report-view.tsx` — headline, four fact tiles, the patterns, and the
  checklist. Each citation is a button.
- `src/components/positions-table.tsx` — positions with adds-down, hold time, entry→exit
  and P&L; a row expands to the fills behind it. Clicking a citation highlights the
  positions a claim rests on and scrolls to the one clicked.
- `resolveEvidence` in `src/lib/report.ts` — maps a citation (position id *or* fill id) to
  the position row to light up. Covered by `npm run check`.
- Added the research-question input, pre-filled with the graded demo question.

Day 5-6 detail — UI redesign (twice):

- First pass (gold/editorial, reference `JOU.jpg`) was built, then discarded by the user.
- **Current design, reference `hin.jpg`:** monochrome black with one muted loss red; story
  first (hero → ticker → what it is → how it works → a real finding) and the tool below.
- Hero: `src/components/terrain.tsx`, a canvas line-field landscape whose valley floor is
  the sample history's real equity curve, with a breathing centre mark and light beam.
- `src/components/how-it-works.tsx`: four panels, each running a working diagram made from
  real sample output (fills feed; T0005-T0008 gathering into P03; figures counting in;
  citations lighting while a fake P99 is struck).
- Motion: scroll-driven reveals, verdict resolving from blur, dust, marquee, panel
  highlights — all off under prefers-reduced-motion.
- `PRODUCT.md`, `DESIGN.md` and `.impeccable/design.json` record the product and the system.
  Design detector: 0 findings.

Day 6 detail — replay and market context (Bitget Skills):

- `src/lib/signal.ts` — server-side MCP client for bitget-signal over plain fetch/JSON-RPC,
  with a 3-minute cooldown after failures so outages never slow every analysis.
- `src/lib/replay.ts` — the history re-run with a rule applied: never average down below
  first entry (sample: +$628.96), wait 3h after a loss (+$539.12), and a −5% stop-loss on
  daily prices that switches itself on when bitget-signal price data returns. A guard
  refuses the stop-loss replay when file prices don't match the market.
- `src/lib/market.ts` — Fear & Greed on each entry date: bitget-signal → alternative.me →
  committed snapshot. Candle parsing written defensively (Skill shape unverified while down).
- The model now receives the replay results and is told a group's total loss is not what a
  habit cost. Before this, the report and the landing page said averaging down "cost
  $1,382"; the replay showed the true cost is $628.96. Landing copy corrected.
- `src/components/replay-view.tsx` — replay cards and the Fear & Greed band chart.

## Not built / known broken

- **The UI has never been seen in a browser by Claude.** Chrome automation fails on every
  attempt ("Frame with ID 0 is showing error page") while curl gets 200 — likely the
  connected browser cannot reach this machine's localhost. Build, typecheck, lint, the
  design detector and `npm run check` all pass, but the visual result — especially the
  canvas terrain, which was written blind — is unverified by eye. **Deploying would make it
  reachable for a screenshot review.**
- Not deployed. Day 5-6.
- No shadcn/ui — plain Tailwind plus a small hand-written component set. Stack says shadcn; not
  adopted because nothing it offers is on the demo path.

## Problems hit and how they were fixed

- Gemini's free tier throws intermittent "high demand" 500s and enforces a per-minute
  request quota held **separately per model** (measured: 3.8-flash 20/min, 3.7/3.5-flash
  20/min, 3.1-flash-lite >60/min, 2.5-flash only 5/min — older is *not* more generous).
  Fixed by making every retry attempt use a different model, best quality first.
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

- **bitget-signal data tools are down upstream** (handshake OK, every tool ConnectTimeout).
  Fear & Greed runs on alternative.me; stop-loss replay waits. Re-run `npm run probe:signal`.
- The candle parser has never seen a real bitget-signal OHLCV response. Verify it the first
  time the Skills answer.
- Sample prices are synthetic, so the stop-loss replay will never show on the demo until the
  sample is rebuilt from real historical prices.
- An analysis took 55s with the Skills down (before cutting the candle budget to 7s).
- Not deployed. Vercel CLI is installed but logged out.

## Next session starts with

User reviews the new design on localhost and reports what looks wrong. Then deploy to Vercel
(day-7 gate is Sept 16) and verify the link in a private window.
