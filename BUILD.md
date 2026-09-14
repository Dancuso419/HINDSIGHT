# BUILD

How to install, run, verify and deploy Hindsight. Kept current — this feeds part 4 of the
submission form.

## Requirements

Node 20+ (built on 24.14.1), npm 11+. Windows note: this project keeps all disk-consuming
work on the **F drive** — `npm config set cache F:\.npm-cache` is already set on the build
machine.

## Install and run

```bash
npm install
npm run gen:trades   # rebuilds public/sample-trades.csv from data/prices.json (deterministic)
npm run dev          # http://localhost:3000
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run fetch:prices` | Re-download the sample symbols' real daily prices into `data/prices.json` (Yahoo Finance) |
| `npm run gen:trades` | Rebuild the sample history: a synthetic trader on those real prices |
| `npm run facts` | Print the computed facts for a CSV (default: the sample) |
| `npm run check` | Parser self-check (asserts, no framework) |
| `npm run lint` | ESLint |
| `npm run probe:signal` | Check the bitget-signal Skills the replay and market context use |
| `npm run e2e` | Run the analysis end to end against a running dev server |

## Environment variables

`GEMINI_API_KEY` — required for the analysis pass. Read **server-side only**, inside the
`/api/analyse` route; it is never sent to the browser. Get a free key at
[aistudio.google.com](https://aistudio.google.com/apikey) and put it in `.env.local`
(gitignored):

```
GEMINI_API_KEY=...
```

Without it the app still ingests and displays a history; **Analyse my decisions** returns a
clear error instead of a report.

### Free-tier quota (measured, not documented)

The request quota is a per-minute bucket held **separately per model**:

| Model | Requests/min |
|---|---|
| `gemini-3.1-flash-lite` | > 60 |
| `gemini-3.8-flash` | 20 |
| `gemini-3.5-flash` | 20 |
| `gemini-2.5-flash` | 5 |

Older models are not more generous — the headroom is in the current-generation *lite*
model. `/api/analyse` therefore tries a different model on each attempt (best quality
first, most headroom last), so one exhausted bucket does not end the request.

### Market data: bitget-signal, with automatic fallback

`BITGET_SIGNAL_URL` — optional. Defaults to the public bitget-signal MCP endpoint
`https://datahub.noxiaohao.com/mcp`, which needs no key.

Every analysis asks the Skills first and falls back without intervention:

| Feature | First choice | If it fails |
|---|---|---|
| Fear & Greed at each entry | bitget-signal `sentiment_index` | alternative.me directly → `data/fng-snapshot.json` |
| Stop-loss replay (daily prices) | bitget-signal `global_assets` (stocks) / `crypto_market` | Yahoo Finance → `data/prices.json`, per symbol |
| Averaging-down and re-entry replays | computed from the fills | — no external data needed |
| Today's technical picture per stock | bitget-signal `technical_analysis` (tokenized /USDT pairs) | none — the panel says which stocks had no data |

After a Skill failure the server skips the Skills for 3 minutes, then tries again, so an
outage never slows every analysis and recovery is picked up automatically. Each panel names
the source that answered.

**Known state (2026-09-14, `npm run probe:signal`):** the server is up, but only tools that
need no third-party data source answer with real data — `technical_analysis` (current
indicators, including tokenized-stock pairs such as NVDA/USDT) and `news_feed` (latest).
Every historical lookup fails upstream: `sentiment_index`, `global_assets`, `crypto_market`,
`crypto_price`, `tradfi_news`, `macro_indicators` history, `rates_yields` history,
`derivatives_sentiment`. The `series_list` / `assets_list` actions answer instantly because
they are static lists, not data. Fear & Greed is served from alternative.me and prices from
Yahoo Finance; bitget-signal is used again automatically once it answers.

The technical picture is **display-only**: it is never sent to the model. Its Bollinger bands
(upper and lower arrive swapped), overall verdict and suggested stop are deliberately dropped
in `src/lib/technicals.ts`. The Skills cooldown is per tool — and per symbol for technical
analysis — so "no pair for KO" never switches the Skill off for NVDA.

## Deploy

Vercel, zero config: import the repo, framework auto-detects as Next.js, set the same env
vars in Project Settings → Environment Variables. Sample data ships in `public/`, so the
demo needs no upload and no login.

## Verify the demo opens for a stranger

1. Open the deployed URL in a **private/incognito window** — no login prompt, no error.
2. Repeat on a phone.
3. Click **Use sample history** — the summary and trade table render without uploading a file.
4. Upload a CSV of your own — a valid file parses, an invalid row is reported on screen
   rather than silently dropped.

## Status

Ingest, analysis, report, replay and market context all work locally. Not deployed. See
`PROGRESS.md`.
