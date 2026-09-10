# Hindsight

AI trade post-mortem tool. Upload a trade history, get a behavioural analysis of your own
decision patterns and a checklist targeting your recurring mistakes.

Hackathon entry: Bitget AI Base Camp S2, **AI Trading Desk** track, **Review &
Self-Evolution** theme. Deadline **Sept 21 2026 (UTC+8)** — submit Sept 20.

This is entry **A of 2**. The sibling entry is Weekend Desk, a separate repo and a
separate submission.

## Read before building

- `docs/02-spec-hindsight.md` — the spec. Follow it.
- `docs/00-hackathon-rules.md` — what makes a submission valid.
- `docs/01-bitget-tools.md` — Bitget stack notes. **Verify against the live repo before
  writing integration code.**
- `PROGRESS.md` — update at the end of every working session.

## Stack — do not change without asking

Next.js + TypeScript + Tailwind, deployed on Vercel.

- LLM calls go through Next.js API routes. Keys stay server-side, never in the browser.
- **Zod** validates all structured LLM output. Malformed JSON must fail loudly, not
  silently render garbage.
- **PapaParse** for CSV parsing.
- **shadcn/ui** for components.
- **No database.** In-memory session state only. Adding one costs a day and buys nothing
  a judge will see.

Ask before adding any dependency.

## Maintain BUILD.md

Create `BUILD.md` at the repo root on day 1 and keep it current: install, run, env vars,
deploy, and how to verify the demo link opens for a stranger. This feeds part 4 of the
submission form, so it must reflect reality on day 12.

## Scope discipline

Build exactly three things: **ingest → analyse → report.**

Out of scope, do not build without being asked: live price feeds, charts, chat interface,
authentication, multi-user support, broker integration, mobile layouts, order placement.

This track is scored 100% subjectively on research quality and interface fluency. One
polished flow beats five half-built features. If a change does not improve the demo path
"upload history → see my recurring mistakes → get a checklist", do not make it.

## Rules

- **This tool must never place an order.** Read-only, always.
- Never commit secrets. `.env.local` is gitignored — verify before the first commit.
- Every claim in a generated report must cite specific trade IDs from the user's data.
  Do not let the LLM assert patterns the data cannot support — fabricated confidence is
  the fastest way to lose a subjective judge.
- Use synthetic trade data until the core loop works. Do not block on real data.
- The demo link must open for a stranger with no login. Test in a private window.

## Working style

- Small commits, working state at each one.
- When something is not working, say so plainly rather than building around it.
- Flag anything that risks the day-7 gate.

## Day 7 gate

If this project is not deployed and demo-able by end of day 7, Weekend Desk is cancelled
and everything goes into polishing this one. Protect the timeline over feature ambition.

## Storage

Anything that consumes disk space (installs, caches, build output, temp files) lives on
the **F drive**, never C. npm cache is set to `F:\.npm-cache`.

@AGENTS.md
