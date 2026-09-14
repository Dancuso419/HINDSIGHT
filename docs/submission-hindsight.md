# Hindsight: submission form draft

Form: https://forms.gle/GyWZCMCPocgJdJon6 · deadline **Sept 21 2026, 23:59 UTC+8** · target: submit Sept 20.
One form response per project. Crosscheck is a **separate** response with the **same** team name, Bitget UID,
email and contact, and a **different** sub-theme (Open Theme).

Fields 1–8 and 17–20 are personal/team details. Fill them yourself (not stored in this public repo).

---

## 9. Competition Track

AI Trading Desk

## 10. Competition Sub-theme

Review & Self-Evolution

## 11. Project Name

Hindsight

## 12. One-line Project Summary (≤140 characters; this is 135)

A one-shot AI post-mortem for traders who never journal: your costliest habits, the trades that prove them, and what fixing each saves.

## 13. Project Description

**1. Thesis**

Retail traders repeat the same expensive mistakes because nothing makes them look back. Their trade history already contains the answer, but a spreadsheet of fills says nothing about the decisions behind it. Hindsight turns a raw trade export into a behavioural post-mortem: the habits costing this trader money, the specific trades that prove each one, and their own history replayed with the fix applied, so they see in dollars what changing the habit would have saved.

Core hypothesis: a trader who will never keep a journal will still act on one honest review of trades they already made, if every claim in it can be verified against those trades.

Why existing tools fall short: the category (TradeZella, TraderSync, Tradervue, Trademetria and newer AI journals) is built on sustained journalling: link a broker, tag trades as you go, keep the habit. That mechanism cannot serve the trader who will not keep the habit, and it is exactly that trader who most needs the review. AI journals also tend to let the model narrate freely over the data, so a confident-sounding claim can rest on a number the model invented. Hindsight takes the opposite approach: every figure is computed in code before the model is involved, the model only chooses which facts matter and explains them, and any trade it cites that does not exist in the file is removed before the report renders.

**2. Target User & Product Value**

Target user: a discretionary retail trader of tokenized US stocks with an account under roughly $10k, making 5–20 trades a month, concentrated in volatile tech-adjacent names, with no journalling habit. Moderate-to-high risk appetite; trades on intuition and momentum; notices they are losing money over time but cannot say why.

Use case: bring the trade history once (as a CSV export, a table pasted from the exchange's order-history page, or screenshots of the order history for apps that cannot export), ask one question in plain language ("Why do I keep losing money on tech-adjacent positions?"), and get an answer in under a minute. Screenshot imports are read by the model, then every row is shown to the trader to check and correct, and a year the screenshot does not show must be typed in rather than guessed.

Product value, from one upload:
- The 2–3 habits that cost this trader the most, each tied to the specific positions and fills behind it. Every citation is clickable and opens the underlying trades.
- A replay of their own history with each rule applied (same trades, same exits, only the forbidden decision removed), stated in dollars saved or, honestly, lost: on the sample history a −5% stop-loss would have cost money, and the report says so instead of recommending it.
- A checklist of rules whose thresholds come from their own data.
- Beside the post-mortem, the current daily technical picture for each stock they traded, live from Bitget's bitget-signal technical-analysis Skill, shown as context rather than a signal.

**3. Validation Data & Key Metrics**

Honest status: Hindsight has not yet been tested by outside users. Real-user figures below are targets, not results.

Product and pipeline metrics (observed on the deployed build and its test suite):
- Full analysis on the live deployment: 12.5 s end to end, observed (single run, 2026-09-14). An earlier build took 99 s locally and timed out in production at 120 s; the fix is described under Progress.
- Fabricated citations reaching the screen: 0 by construction, observed in the automated check, which feeds a report citing non-existent positions and confirms they are stripped and a pattern left with no real evidence is dropped.
- Arithmetic the model performs: none required. Every figure in the prompt is precomputed (win rate, hold times, replay deltas, re-entry gaps). Observed that the first model build subtracted timestamps itself; those gaps were then moved into the computed facts.
- bitget-signal technical-analysis coverage: 9 of 11 sample stocks returned live data, observed 2026-09-14 (no pair for KO or XOM).
- Screenshot import accuracy: 102 of 102 fields correct and 0 years invented, on two rendered test screenshots with known ground truth (a desktop order table and a year-less phone card list), observed. These are clean renders; real phone captures will be noisier, which is why every row is reviewed before use.

Demonstration data (synthetic, clearly labelled in the product): the bundled sample is a synthetic trader with fixed habits trading 11 real US stocks on real daily prices (every fill is inside that day's real high–low range). On it, Hindsight finds that the trader's two re-entries within two hours of a loss, at roughly 4× usual size, lost $1,497, more than their entire −$1,217 net result, and that waiting three hours after any loss would have saved $1,445.52 (observed output on synthetic data).

Validation plan (target), running before and after submission:
- Recruit 6–8 real traders on campus who trade anything, and run Hindsight on their own exported history.
- Primary metric: "Did this tell you something about your trading you did not already know?" Target: ≥ 5 of 8 yes.
- Secondary: task completion (upload → report without help), target 8 of 8; time to first report, target under 60 s; whether they would change one specific habit after reading, target ≥ 4 of 8.
- Every result will be reported as observed, including negatives.

**4. Progress**

Built and deployed (live, no login):
- Ingest: three ways in. CSV upload, pasting a copied order table (reads "218.29 USDT", "NVDA/USDT", "Open long"/"Close long"), and screenshots of the order history read by the model with a mandatory review-and-edit step. Per-row error reporting; fills grouped into round-trip positions.
- Analyse: all behavioural facts computed deterministically; replays of three rules on the trader's own history; entry-day market sentiment; a server-side LLM pass constrained by a JSON schema, re-validated with Zod, with a citation guard.
- Report: patterns with clickable evidence that scrolls to and expands the underlying fills, the rule replays, sentiment-at-entry chart with a table view, a live technical picture per traded stock, and the checklist.
- A landing page that explains the mechanism with working diagrams built from real pipeline output.

Problems hit and how they were fixed:
- Production analysis timed out at 120 s: the model call had no timeout and one model hung past 110 s. Measured every model on the real prompt and switched to a capped, ordered fallback chain under one deadline, with 12.5 s observed afterwards.
- A model's output broke the schema's length limits and the request failed instead of trying another model; schema failures now count as a failed attempt and the next model runs. Invalid output is never rendered.
- Position building treated a position as open until quantity reached exactly zero, so exchange rounding dust (buys of 6.3167 + 7.3284 closed by a sale of 13.645) silently merged unrelated later trades. Positions now close within 0.1% of size, with a regression test.
- On an earlier version of the sample, the report said averaging down "cost $1,382"; replaying that history showed the true cost was $628.96. The rest would have been lost on the first entry anyway. The model now receives replay figures and is instructed that a group's total loss is not what a habit cost.
- bitget-signal's historical tools (sentiment history, stock prices) have been failing upstream; every analysis tries the Skill first and falls back automatically (alternative.me, Yahoo Finance, committed snapshots), with the source named on screen. Its technical-analysis Skill returns Bollinger bands with upper and lower swapped and a directional verdict built partly on them; both are deliberately excluded.

Next steps: campus testers, including real phone screenshots to measure extraction accuracy beyond clean renders; native parsing of Bitget export formats; switching all market context back to bitget-signal as its historical tools recover; a stock-market sentiment measure to replace the crypto Fear & Greed index for equity histories.

Stack: Next.js, TypeScript, Tailwind CSS, Lenis, PapaParse, Zod; deployed on Vercel. Data: Bitget bitget-signal MCP (technical_analysis live; sentiment_index and global_assets with fallbacks), alternative.me, Yahoo Finance.

**5. Your Take on AI Trading (optional)**

The most useful thing AI can do for a retail trader is not to predict the next move. It is to make them honest about their last hundred. That only works if the AI cannot flatter or frighten them with numbers it made up. Our view: let code do the arithmetic, let the model do the explaining, and make every claim clickable back to a trade.

## 14. Submission Material Links (one per line, labelled)

Live demo (no login): https://hindsight-brown-eight.vercel.app
GitHub repository (public, with README): https://github.com/Dancuso419/HINDGESIGHT
Run record: full research-task walkthrough, question to actionable insight, from a real production run: https://github.com/Dancuso419/HINDGESIGHT/blob/main/docs/WALKTHROUGH.md
Run record: raw output of that run: https://github.com/Dancuso419/HINDGESIGHT/blob/main/docs/walkthrough-run.json
Demo video (≤3 min, X or YouTube; strongly recommended, not required): TODO, paste link if recorded

## 15. Role of the LLM / AI in Your Project

Report generation: Google Gemini via the Gemini API, called server-side only. Primary model gemini-3.5-flash with minimal thinking; automatic fallbacks gemini-3.1-flash-lite and gemini-3.8-flash, each attempt time-capped. The model receives facts already computed in code (positions, win rate, hold times, rule replays in dollars, re-entry gaps, entry-day sentiment) and is forbidden to compute or invent numbers. It chooses the 2–3 habits that cost the trader most, explains them in plain language citing specific position and trade IDs, and writes a checklist whose thresholds come from those facts. Output is constrained by a JSON schema, re-validated with Zod, and passed through a citation guard that removes any cited ID not present in the uploaded file; a report that fails any check is discarded and the next model is tried.

The model does not see the live technical-analysis data and does not produce any trading signal, price prediction or order.

Market data: Bitget's bitget-signal Skills over MCP: technical_analysis for each traded stock's current daily picture; sentiment_index and global_assets for entry-day sentiment and the stop-loss replay, with automatic fallbacks while those tools are unavailable.

Development: the codebase was written with Anthropic's Claude (Claude Opus 5 in Claude Code) as a coding assistant.

## 16. X Project Post URL

TODO: paste the link to post 1 after publishing. It must include #BitgetHackathon and @Bitget_AI and describe the product substantively. Also retweet the official Bitget post.

### X thread draft (each post under 280 characters; X counts a link as 23)

**Post 1 (257)**

```
I built Hindsight for #BitgetHackathon @Bitget_AI

A one-shot AI post-mortem for traders who never journal: the habits costing you money, the exact trades that prove each one, and what fixing each would have saved.

Try it, no login: https://hindsight-brown-eight.vercel.app
```

**Post 2 (256), reply to post 1**

```
The AI can't make a number up.

Every figure is computed in code first. The model only picks which habits matter and explains them. Every claim cites trade IDs you can click to see the fills, and any ID that isn't in your file is removed before you see it.
```

**Post 3 (273), reply to post 2**

```
On the sample history (a synthetic trader on real US stock prices): 78% win rate, still down $1,217.

2 trades opened within 2h of a loss, at about 4x normal size, lost $1,497. Waiting 3h after any loss would have saved $1,446.

A 5% stop would have cost money. It says so.
```

**Post 4 (270), reply to post 3**

```
No CSV export in your app? Paste the table or upload screenshots of your order history. You check every row before it is analysed.

Live technical analysis comes from Bitget's bitget-signal Skills.

AI Trading Desk · Review & Self-Evolution
Code: https://github.com/Dancuso419/HINDGESIGHT
```

---

## Before submitting (from docs/04-submission-checklist.md)

- [ ] Screen recording of the full demo path, uploaded, link in field 14
- [ ] X post published, link in field 16; official post retweeted
- [ ] Demo link opened in a private window **and** on a phone
- [ ] Search this description for "all traders": none
- [ ] Read Hindsight's and Crosscheck's descriptions back to back: two products, not one renamed
- [ ] Screenshot the confirmation page
