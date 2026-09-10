# Spec — Hindsight (Entry A)

**Track:** AI Trading Desk
**Theme:** Review & Self-Evolution (named sub-theme — 1 winner)

---

## Thesis

Retail traders repeat the same mistakes because nothing forces them to look back. Trade
history is available but unreadable — a spreadsheet of fills tells you nothing about the
*decisions* behind them. Hindsight turns a raw trade log into a behavioural post-mortem
and a checklist targeted at that specific person's recurring errors.

The theme asks: *after trading, how does AI help the trader review and iterate their
research framework?* Answer it literally.

## Target user

Retail traders under ~$10k account size, 5–20 trades/month, discretionary, no journalling
habit, primarily crypto with some tokenized equity exposure. Not "all traders."

---

## The one complete research task (this is the graded artefact)

**Question:** "Why do I keep losing money on tech-adjacent positions?"
→ upload history → pattern analysis → **actionable insight**: "You exit winners at +4%
average but hold losers to -12%. Your 6 largest losses were all averaged into. Checklist:
[3 rules]."

Judges want question → actionable insight, end to end. Build the demo around that path.

---

## Scope — build exactly these three, nothing else

1. **Ingest** — CSV upload → parsed, normalised trade list. Handle a generic schema
   (timestamp, symbol, side, qty, price, fee). Ship synthetic data first so nothing blocks.
2. **Analyse** — one LLM pass tagging each trade/position with a decision pattern and a
   confidence. See `03-prompts.md` when written.
3. **Report** — top 3 recurring mistakes, each backed by the *specific trades as evidence*,
   plus a generated checklist the user can reuse.

## Explicitly out of scope

Live price feeds. Charting libraries. Chat interface. Auth/login. Multi-user accounts.
Broker API integration. Mobile layout. Anything touching order placement.

Depth on one flow beats breadth. The track is judged subjectively on research quality and
interface fluency, not feature count.

---

## Candidate decision patterns to tag

- Cutting winners early / letting losers run (asymmetric exit discipline)
- Averaging down into a losing position
- Revenge trading — size or frequency spike after a loss
- Overtrading a single symbol
- Position sizing inconsistent with prior outcomes
- Entry with no identifiable catalyst
- Time-of-day or day-of-week clustering in losses

Do not invent patterns the data cannot support. Every claim in the report must point to
specific trade IDs. Fabricated confidence is the fastest way to lose a subjective judge.

---

## Validation plan (form part 3 — do not skip)

Recruit **6–8 real testers on campus** who trade anything. One question: *"did this tell
you something you did not already know?"*

Report the honest number, including failures. Label figures `observed`. Almost no solo
entrant will have real user data — this paragraph is the differentiator.

---

## Build order

| Day | Target |
|---|---|
| 1 | Synthetic CSV generator + parser. Something renders. |
| 2 | LLM tagging pass returns structured output |
| 3–4 | Report view with evidence links |
| 5 | Checklist generation |
| 6 | Deploy, harden, verify link opens in a private window |
| 7 | **GATE** — demo-able? If no, drop Entry B |
