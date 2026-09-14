# Hindsight

**A one-shot AI post-mortem for traders who never journal.** Give it your trade history — a CSV,
a pasted table or screenshots of your order history — and it tells you which habits are costing
you money, points at the exact trades that prove each one, and replays your own history with the
fix applied so you can see, in dollars, what changing the habit would have saved.

**Live demo (no login):** https://hindsight-brown-eight.vercel.app
**Worked example:** [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md) — one complete research task, question to checklist, from a real run.

Built for Bitget AI Base Camp Hackathon S2 · AI Trading Desk track · Review & Self-Evolution.

---

## Why

Retail traders repeat the same expensive mistakes because nothing makes them look back. Their
trade history already holds the answer, but a list of fills says nothing about the decisions
behind it. Trading journals (TradeZella, TraderSync, Tradervue and newer AI journals) only work if
you keep one; the trader who will not keep the habit is the one who most needs the review.

Hindsight asks for nothing but the history you already have — and it is built so the AI **cannot
make a number up**:

- Every figure is computed in code before the model sees anything.
- The model only chooses which facts matter and explains them in plain language.
- Every claim cites specific position and trade IDs; any cited ID that is not in your file is
  removed before the report renders.
- Every citation in the report is clickable and opens the fills behind it.

## What you get

1. **The habits that cost you most** — two or three patterns, each with the positions that prove it.
2. **Your history, replayed with each rule** — same trades, same exits, only the forbidden decision
   removed: never averaging down below your first entry, waiting three hours after a loss, and a −5%
   stop-loss on real daily prices. A rule that would have *lost* money is reported as such, not
   recommended.
3. **A checklist** whose thresholds come from your own data.
4. **Market context** — the Fear & Greed index on each entry day, and the current daily technical
   picture of every stock you traded from Bitget's `bitget-signal` technical-analysis Skill. Context
   only: it never enters the report and never becomes a signal.

## Three ways in

| | How | Notes |
|---|---|---|
| **CSV** | Upload any export with time, symbol, side, quantity and price | Column names are matched loosely; bad rows are reported, never silently dropped |
| **Paste** | Copy the order table from an exchange page, Excel or Google Sheets | Reads `218.29 USDT`, `NVDA/USDT`, `Open long` / `Close long` |
| **Screenshots** | Up to 4 screenshots of your order history, from any app | Gemini transcribes the rows; **you review and edit every row** before analysis. A year the screenshot does not show must be entered by you — it is never guessed |

No trades to hand? **Use the sample history** — a synthetic trader with fixed habits, trading 11 real
US stocks on real daily prices (every fill sits inside that day's real high–low range).

## How it works

```
trades ─► positions (round trips) ─► facts computed in code ─┬─► LLM writes the report ─► schema + citation checks ─► report
                                     rule replays in dollars ┤
                                     entry-day sentiment ────┘
                         bitget-signal technical_analysis ───────────────────────────────────────────────► context panel
```

- **Positions** — fills grouped into round trips per symbol (long only), tolerant of exchange rounding dust.
- **Facts** — win rate, average win/loss, hold times, positions averaged down, re-entries after a
  loss with their gap in minutes and size, per-symbol results. `src/lib/analysis.ts`
- **Replays** — `src/lib/replay.ts`
- **Report** — Gemini, called server-side only, constrained by a JSON schema, re-validated with Zod,
  with a citation guard. Attempts run `gemini-3.5-flash` (minimal thinking) → `gemini-3.1-flash-lite` →
  `gemini-3.8-flash`, each time-capped under one deadline; output that fails any check is discarded
  and the next model runs. `src/app/api/analyse/route.ts`, `src/lib/gemini.ts`
- **Screenshots** — `src/app/api/extract/route.ts`, `src/lib/extract.ts`

### Data sources and fallbacks

Every request tries Bitget's `bitget-signal` Skills first and falls back automatically; each panel
names the source that answered, and the Skill is used again as soon as it recovers.

| Feature | First choice | Fallback |
|---|---|---|
| Current technical picture per stock | `bitget-signal` `technical_analysis` (tokenized `/USDT` pairs) | shown as unavailable |
| Fear & Greed on entry days | `bitget-signal` `sentiment_index` | alternative.me → committed snapshot |
| Daily prices for the stop-loss replay | `bitget-signal` `global_assets` / `crypto_market` | Yahoo Finance → committed prices |

Known Skill issues handled in code: `technical_analysis` returns Bollinger bands with upper and
lower swapped, so bands and the verdict built on them are not shown; historical Skill tools have
been failing upstream, which is what the fallbacks are for.

**Read-only by design.** Hindsight never connects to a trading account and never places an order.
Nothing is stored: no account, no database.

## Honest status

- Deployed and working end to end. Full analysis on the live site: 12.5 s (observed, single run).
- Screenshot reading: 102/102 fields correct and 0 invented years on two rendered test screenshots
  with known ground truth. Real phone screenshots are noisier — the review step is mandatory for that reason.
- **Not yet tested by outside users.** Validation with campus traders is planned; results will be
  reported as observed, including negatives.

## Run it locally

Requires Node 20+.

```bash
npm install
# create .env.local as shown below
npm run dev                  # http://localhost:3000
```

`.env.local`:

```
GEMINI_API_KEY=your-key      # free at https://aistudio.google.com/apikey
# BITGET_SIGNAL_URL=...      # optional; defaults to the public bitget-signal MCP endpoint
```

| Script | What it does |
|---|---|
| `npm run dev` / `npm run build` | Develop / production build |
| `npm run check` | All logic checks: parsing, positions, facts, citation guard, replays, market parsing, screenshot review rows |
| `npm run lint` | ESLint |
| `npm run probe:signal` | Which bitget-signal tools are answering right now |
| `npm run fetch:prices` / `npm run gen:trades` | Refresh the real price data / rebuild the sample history |
| `npx tsx scripts/eval-extract.ts` | Measure screenshot extraction accuracy (spends Gemini requests) |

Deployment, environment variables and operational notes: [`BUILD.md`](BUILD.md).

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Lenis · PapaParse · Zod · Google Gemini API ·
Bitget `bitget-signal` MCP · Vercel. Written with Claude (Claude Opus 5 in Claude Code) as the coding assistant.

## Repository map

```
src/app/page.tsx               the single page: story, import, report
src/app/api/analyse/route.ts   facts → replays → market data → model → checks
src/app/api/extract/route.ts   screenshots → rows for review
src/lib/                       trades, analysis, replay, market, technicals, signal (MCP client), gemini, extract
src/components/                terrain (hero canvas), import, report, replay, technicals, positions table
scripts/                       checks, sample generator, price fetch, probes and evaluations
data/                          committed price and sentiment snapshots used as fallbacks
docs/                          hackathon notes, submission draft, walkthrough
```
