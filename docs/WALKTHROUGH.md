# Walkthrough — one complete research task

**Question → evidence → actionable insight**, run on the live deployment.

- Demo: https://hindsight-brown-eight.vercel.app (no login)
- Run: 2026-09-14, `POST /api/analyse`, **HTTP 200 in 11.1 s** (observed)
- Raw response of this exact run, unedited: [`walkthrough-run.json`](walkthrough-run.json)
- Data: the bundled sample history — **a synthetic trader on real prices.** The trader's habits are
  invented rules; every fill is on a real US trading day inside that day's real high–low range for
  the stock (daily candles from Yahoo Finance). It is labelled as synthetic in the product.

---

## The question

> **"Why do I keep losing money on tech-adjacent positions?"**

The trader: 116 fills across 11 US stocks from October 2025 to August 2026. A 78% win rate — and
still down.

## Step 1 — load the history

On the demo, scroll to **Run it on your trades** and choose **Use the sample history**. (With your own
data: **Upload your CSV**, **Paste trades** copied from an order-history table, or **Read screenshots**
of the order history — screenshot rows are reviewed and corrected before use.)

The page confirms: `sample-trades.csv · 116 fills · 41 round trips · 11 symbols`.

## Step 2 — ask

The question box is pre-filled with the question above. Choose **Analyse**.

## Step 3 — what is computed before any AI is involved

Hindsight groups the fills into 41 round-trip positions and computes every figure in code
(`src/lib/analysis.ts`, `src/lib/replay.ts`). The model later receives these as fixed facts and may
not compute or invent a number. From this run:

| Fact | Value |
|---|---|
| Closed positions / win rate / net result | 41 / 78% / **−$1,216.51** |
| Average winner vs average loser | +3.9% held 308 h · **−9.43% held 699 h** |
| Positions added to below their first entry | 22, which lost $1,568.95 in total |
| Re-entries within 3 h of closing a loss | P10 (116 min after P04, 4.35× median size) · P06 (27 min after P05, 3.97×) · P41 (23 min after P40, 1.27×) |

Per stock, which is where the question points:

| Tech-adjacent | Result | Everything else | Result |
|---|---|---|---|
| MSTR (5 positions) | **−$1,110.22** | KO (3) | +$110.60 |
| COIN (3) | **−$667.47** | XOM (2) | +$46.55 |
| NVDA (5) | **−$646.92** | JPM (3) | +$33.85 |
| PLTR (3) | +$111.92 | WMT (5) | +$1.38 |
| TSLA (3) | +$207.28 | | |
| META (4) | +$311.14 | | |
| AMD (5) | +$385.38 | | |
| **All tech-adjacent** | **−$1,408.89** | **All other** | **+$192.38** |

So "tech-adjacent" is not uniformly bad: four tech names made money. The losses sit in three —
MSTR, COIN and NVDA, −$2,424.61 between them (sum of the three rows above).

## Step 4 — the report

Returned by `gemini-3.5-flash`, validated against the report schema, citations checked against the
file (0 citations removed). Verbatim:

> **You sabotage your trading capital by jumping into revenge trades immediately following significant losses.**

**1. You revenge trade after losses, which resulted in a $1,497.36 loss across two positions.** · high confidence · evidence **P10, P06**

> When you close a losing position, you often open a new one within 116 minutes or less with sizes up to
> 4.35 times your median trade size. These high-pressure entries into P10 and P06 have exacerbated your
> drawdown significantly compared to your disciplined trades.
>
> The REPLAY data indicates that waiting 3 hours after closing a loss before opening a new position would
> have saved you $1,445.52.

**2. You average down into losing positions, which contributed to your $1,568.95 total loss in these trades.** · high confidence · evidence **P06, P05, P10, P04, P35**

> You added to losing positions 22 times across your portfolio. In trades like P06, P05, P10, and P04, you
> added to the position even as the price moved against you, increasing your exposure while the position
> was already underwater.
>
> The REPLAY data shows that a rule to never add to a position trading below your first entry would have
> saved you $307.96.

*One wording slip, left in on purpose:* "22 times" should read "22 positions" — the fact is a count of
positions, several of which were added to twice. The dollar figures are exact.

## Step 5 — verify a claim by clicking it

Every evidence ID in the report is a button. Clicking **P06** highlights it in the positions table,
scrolls to it and opens the fills behind it.

**P06 · MSTR · −$914.84 (−16.8%)** — opened at 20:28, 27 minutes after P05 closed at 20:01:

| Fill | Time (UTC) | Side | Qty | Price |
|---|---|---|---|---|
| T0022 | 2025-11-06 20:28 | buy | 7.6799 | 248.68 |
| T0023 | 2025-11-07 14:42 | buy | 8.8663 | 238.62 |
| T0025 | 2025-11-12 15:59 | buy | 6.1979 | 228.98 |
| T0026 | 2025-11-14 14:40 | sell | 22.7441 | 199.43 |

**P05 · COIN · −$604.98 (−15.6%)** — the loss P06 was opened straight after:

| Fill | Time (UTC) | Side | Qty | Price |
|---|---|---|---|---|
| T0014 | 2025-10-27 17:10 | buy | 3.2278 | 368.84 |
| T0016 | 2025-10-29 16:47 | buy | 3.9995 | 352.39 |
| T0017 | 2025-10-30 15:54 | buy | 3.7956 | 336.67 |
| T0021 | 2025-11-06 20:01 | sell | 11.0229 | 297.30 |

Both positions show the two habits together: straight back in after a loss, then two adds below the
first entry. The same is true of **P10 · NVDA · −$582.52**, opened 116 minutes after **P04 · MSTR ·
−$270.91** closed. Those four positions alone lost $2,373.25.

## Step 6 — the replays

Same trades, same exits, same timing — only the decision a rule forbids is removed:

| Rule | Positions affected | Actual → replayed | Would have |
|---|---|---|---|
| Wait 3 hours after closing a loss before opening anything | P10, P06, P41 | −$1,445.52 → $0 | **saved $1,445.52** |
| Never add to a position trading below your first entry | 22 | −$1,568.95 → −$1,260.99 | **saved $307.96** |
| Exit any position that falls 5% below entry (daily prices via Yahoo Finance) | 16 | −$2,038.97 → −$2,126.61 | **cost $87.64** |

The stop-loss result is the honest surprise: on this history a tight stop would have lost money, and the
report does not recommend one.

## Step 7 — context beside the post-mortem

- **Fear & Greed on entry days** (via alternative.me, because bitget-signal's sentiment history was not
  answering): losing entries averaged 33.7, winning entries 27.5. Positions opened in the *Fear* band lost
  $1,362.88. Shown as context; the report does not build a claim on it.
- **Today's technical picture** for each stock traded, live from Bitget's `bitget-signal` technical-analysis
  Skill (9 of 11 stocks; no pair for KO or XOM). For MSTR at the time of the run: price $135.70, RSI 57.6,
  above its 7-, 25- and 99-day averages, average daily range 5.65%, nearest support $123.53 / resistance
  $139.06. Context only — never sent to the model, never a signal.

## The actionable insight

**Answer to the question:** the trader does not lose money on tech-adjacent stocks as such — four tech
names were profitable. The losses are concentrated in three names (MSTR, COIN, NVDA), and they
come from two decisions made together: **opening a new, oversized position within two hours of closing a
loss, and then adding to it as it fell.** The single rule worth adopting first, by the replay, is the
three-hour wait: it would have saved $1,445.52 on its own — more than the trader's entire net loss.

**The checklist Hindsight produced** (verbatim):

- [ ] Check the time since your last closed position and ensure at least 180 minutes have passed before entering a new one.
- [ ] Verify that the current price of the security is above your initial entry price before adding any additional size to the position.
- [ ] Limit your position size to no more than 1.0 times your median notional value of $1,370.19 for any new entry.

---

## How to check this yourself

- Open the demo, use the sample history, ask the same question. The report's wording will differ between runs
  (the model writes it fresh), and the live market context moves with the market. The facts, per-stock
  results and replays will be identical, because they are computed from the same fills every time.
- Every dollar figure in this document appears in [`walkthrough-run.json`](walkthrough-run.json) (facts,
  replays, market, technicals, positions and the report).
- The logic behind the numbers is covered by `npm run check`.
