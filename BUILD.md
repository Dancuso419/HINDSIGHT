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
npm run gen:trades   # writes public/sample-trades.csv (deterministic synthetic history)
npm run dev          # http://localhost:3000
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run gen:trades` | Regenerate the synthetic demo history |
| `npm run check` | Parser self-check (asserts, no framework) |
| `npm run lint` | ESLint |

## Environment variables

None yet. The LLM analysis pass (day 2) adds `ANTHROPIC_API_KEY`, read **server-side only**
inside a Next.js API route. Put it in `.env.local`, which is gitignored — never in client
code, never committed.

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

Day 1 complete: ingest (CSV parse + normalise + sample generator) renders. Analyse and
report are not built yet — see `PROGRESS.md`.
