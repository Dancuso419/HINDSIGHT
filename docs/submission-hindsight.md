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

Traders repeat the same costly mistakes because nothing makes them look back, and journals only work if you keep one. Hindsight reads a trade history once, finds the habits costing money, cites the exact trades behind each, and replays the history with the fix to show the dollars saved. The AI cannot invent numbers: code computes every figure, and citations to trades not in the file are removed.

**2. Target User & Product Value**

Retail traders of tokenized US stocks: moderate-to-high risk appetite, under $10k capital, 5–20 trades a month, no journalling habit. After a losing month they upload a CSV, paste a table or screenshot their order history, and ask "why do I keep losing?". Existing tools need a journal kept daily, show P&L but not the decision behind it, or let AI state numbers the data does not support.

**3. Validation Data & Key Metrics**

Observed: full analysis in 11–12.5 s on the live site; screenshot reading 102/102 fields correct on test images; 0 fabricated citations reach the report (automated check); 0 real users so far. On the sample (synthetic trader, real US stock prices): two trades opened right after a loss lost $1,497, and waiting 3 hours after any loss would have saved $1,446. Targeted: 6–8 campus testers with at least 5 of 8 learning something new; activation 30% of visitors; retention 3 of 8 re-running within 30 days; risk measured as fewer re-entries after losses on their next export. Trading volume, AUM and fees: not applicable (read-only tool).

**4. Progress**

Built and live: CSV, paste and screenshot import; facts computed in code; three rule replays; Gemini report with schema and citation checks; clickable evidence; live technicals from Bitget bitget-signal. Not built: accounts, short positions, usage analytics, real-user testing. Fixed: a 120 s production timeout (capped model fallbacks), rounding dust merging positions, and a report overstating a habit's cost (now uses replay figures). Next: campus testers and Bitget export formats. Stack: Next.js, TypeScript, Zod, Vercel, Google Gemini, bitget-signal MCP (technical_analysis, sentiment_index, global_assets).

**5. Your Take on AI Trading (optional)**

AI should make traders honest about their past trades, not predict the next move. Bitget feedback: bitget-signal returns Bollinger bands with upper and lower swapped, its historical tools return empty errors instead of failing clearly, and an as-of date on technical_analysis would help review tools.

## 14. Submission Material Links (one per line, labelled)

Project link (demo): https://hindsight-brown-eight.vercel.app
Project link (GitHub): https://github.com/Dancuso419/HINDGESIGHT
Run record (walkthrough): https://github.com/Dancuso419/HINDGESIGHT/blob/main/docs/WALKTHROUGH.md
Demo video (X): PASTE_POST_1_LINK_HERE

## 15. Role of the LLM / AI in Your Project

Gemini (gemini-3.5-flash, with 3.1-flash-lite and 3.8-flash as fallbacks) writes the report from figures computed in code and reads trades from order-history screenshots for the user to check; it never computes numbers, gives signals or places orders. The code was written with Claude (Claude Code).

## 16. X Project Post URL

TODO: paste the link to post 1 after publishing. It must include #BitgetHackathon and @Bitget_AI and describe the product substantively. Also retweet the official Bitget post.

### X thread (each post under 280 characters; X counts a link as 23)

**Post 1 (277), with the demo video attached**

```
I built Hindsight for #BitgetHackathon @Bitget_AI

An AI post-mortem for traders who never journal: the habits costing you money, the exact trades that prove each one, and what fixing each would have saved.

Demo on a sample history. Try it: https://hindsight-brown-eight.vercel.app

#AITrading
```

**Post 2 (256), reply to post 1**

```
The AI can't make a number up.

Every figure is computed in code first. The model only picks which habits matter and explains them. Every claim cites trade IDs you can click to see the fills. Any ID not in your file is removed.

#BitgetHackathon @Bitget_AI
```

**Post 3 (279), reply to post 2**

```
Sample history (a synthetic trader on real US stock prices): 78% win rate, still down $1,217.

2 trades opened within 2h of a loss, at ~4x normal size, lost $1,497. Waiting 3h after any loss would have saved $1,446.

A 5% stop would have cost money. It says so.

#BitgetHackathon
```

**Post 4 (271), reply to post 3**

```
No CSV export in your app? Paste the table or upload screenshots of your order history. You check every row first.

Live technical analysis from Bitget's bitget-signal Skills.

AI Trading Desk · Review & Self-Evolution
https://github.com/Dancuso419/HINDGESIGHT

#BitgetHackathon @Bitget_AI
```

---

## Before submitting (from docs/04-submission-checklist.md)

- [ ] Screen recording of the full demo path, uploaded, link in field 14
- [ ] X post published, link in field 16; official post retweeted
- [ ] Demo link opened in a private window **and** on a phone
- [ ] Search this description for "all traders": none
- [ ] Read Hindsight's and Crosscheck's descriptions back to back: two products, not one renamed
- [ ] Screenshot the confirmation page
