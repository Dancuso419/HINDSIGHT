/**
 * The sample history: a synthetic trader, real prices.
 *
 * The trader is invented; the market is not. Every fill happens on a real US trading day at a
 * price inside that day's real high-low range (data/prices.json, from Yahoo Finance). The trader's
 * habits are fixed rules, applied identically to every stock:
 *   - chases: prefers a stock that has just run up, and buys in the upper part of the day
 *   - takes profit fast, at +2.5% to +5% on average cost
 *   - adds to a falling position, up to twice, each 4-6% below the last buy
 *   - capitulates late, at -11% to -17% on average cost, or bails after 30 trading days
 *   - after a loss, often opens a new position the same day at 2-2.5x usual size
 * Outcomes are whatever those habits produce on the real price path — nothing is scripted to
 * win or lose. Deterministic (seeded) so the demo never shifts.
 * Run: npm run fetch:prices, then npm run gen:trades
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { SAMPLE_SYMBOLS } from "./sample-symbols";
import type { Candle } from "../src/lib/replay";

let seed = 20260920;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const HOUR = 3_600_000;

const prices = new Map<string, Map<number, Candle>>();
const series = new Map<string, Candle[]>();
const priceFile: { symbols: Record<string, Candle[]> } = JSON.parse(readFileSync("data/prices.json", "utf8"));
for (const { symbol } of SAMPLE_SYMBOLS) {
  const candles = priceFile.symbols[symbol];
  series.set(symbol, candles);
  prices.set(symbol, new Map(candles.map((c) => [c.t, c])));
}

const START = Date.UTC(2025, 9, 1); // 1 Oct 2025
const LAST_ENTRY = Date.UTC(2026, 6, 31); // leave ~6 weeks of real data for exits
const MAX_OPEN = 3;
const MAX_HOLD_DAYS = 30;

const calendar = series.get("NVDA")!.map((c) => c.t).filter((t) => t >= START);

type Row = { timestamp: string; symbol: string; side: "buy" | "sell"; qty: number; price: number; fee: number };
type Open = {
  symbol: string;
  openedDay: number;
  rows: Row[];
  firstQty: number;
  qty: number;
  cost: number;
  lastBuy: number;
  adds: number;
  takeProfit: number;
  capitulate: number;
  addGap: number;
};

const done: Row[] = [];
const open: Open[] = [];
const fill = (at: number, symbol: string, side: Row["side"], qty: number, price: number): Row => ({
  timestamp: new Date(at).toISOString(),
  symbol,
  side,
  qty: Number(qty.toFixed(4)),
  price: Number(price.toFixed(2)),
  fee: Number((qty * price * 0.0006).toFixed(2)),
});
/** A moment in the US session, 14:30-20:30 UTC. */
const session = (day: number, from = 14.5, to = 20.5) => day + between(from, to) * HOUR;

/** The stock that "looks hot": up more than 3% over the last three sessions. */
function hotSymbols(dayIndex: number, day: number) {
  return SAMPLE_SYMBOLS.map((x) => x.symbol).filter((symbol) => {
    const s = series.get(symbol)!;
    const i = s.findIndex((c) => c.t === day);
    if (i < 3) return false;
    return s[i - 1].close / s[i - 4].close - 1 > 0.03;
  });
}

let pendingRevenge: { after: number; size: number } | null = null;

for (let d = 0; d < calendar.length; d++) {
  const day = calendar[d];
  const closedToday = new Set<string>();

  // 1. Manage what is already open, in a random order.
  for (const pos of [...open].sort(() => rnd() - 0.5)) {
    const c = prices.get(pos.symbol)!.get(day);
    if (!c || day === pos.openedDay) continue;
    const avg = pos.cost / pos.qty;
    let exitPrice = 0;
    let exitAt = 0;

    if (c.high >= avg * (1 + pos.takeProfit)) {
      exitPrice = clamp(avg * (1 + pos.takeProfit), c.low, c.high);
      exitAt = session(day);
    } else if (c.low <= avg * (1 - pos.capitulate)) {
      exitPrice = clamp(avg * (1 - pos.capitulate), c.low, c.high);
      exitAt = session(day);
    } else {
      const addLevel = pos.lastBuy * (1 - pos.addGap);
      if (pos.adds < 2 && c.low <= addLevel) {
        const price = clamp(addLevel, c.low, c.high);
        const addQty = pos.firstQty * between(0.8, 1.3);
        pos.rows.push(fill(session(day, 14.5, 17), pos.symbol, "buy", addQty, price));
        pos.qty += addQty;
        pos.cost += addQty * price;
        pos.lastBuy = price;
        pos.adds++;
      }
      const held = calendar.indexOf(day) - calendar.indexOf(pos.openedDay);
      if (held >= MAX_HOLD_DAYS) {
        exitPrice = c.close;
        exitAt = session(day, 19.5, 20.5);
      }
    }

    if (exitAt) {
      pos.rows.push(fill(exitAt, pos.symbol, "sell", pos.qty, exitPrice));
      done.push(...pos.rows);
      open.splice(open.indexOf(pos), 1);
      closedToday.add(pos.symbol);
      const pnl = pos.qty * exitPrice - pos.cost;
      if (pnl < -40 && rnd() < 0.6 && !pendingRevenge) {
        // 2-2.5x their usual ~$800 ticket, as documented above.
        pendingRevenge = { after: exitAt, size: 800 * between(2, 2.5) };
      }
    }
  }

  if (day > LAST_ENTRY) continue;

  // 2. Open something new: straight back in after a loss, or on an ordinary day.
  const wantsIn = pendingRevenge ? true : rnd() < 0.3;
  if (!wantsIn || open.length >= MAX_OPEN) {
    pendingRevenge = null;
    continue;
  }

  // A symbol sold today is not re-bought today: its fills would interleave with the sale.
  const held = new Set([...open.map((p) => p.symbol), ...closedToday]);
  const hot = hotSymbols(d, day).filter((sym) => !held.has(sym));
  const any = SAMPLE_SYMBOLS.map((x) => x.symbol).filter((sym) => !held.has(sym) && prices.get(sym)!.has(day));
  const choices = hot.length && rnd() < 0.7 ? hot : any;
  if (!choices.length) continue;
  const symbol = pick(choices);
  const c = prices.get(symbol)!.get(day)!;

  const entryPrice = c.low + between(0.55, 1) * (c.high - c.low); // chases into the upper part of the day
  const notional = pendingRevenge ? pendingRevenge.size : between(400, 1200);
  const at = pendingRevenge ? Math.min(pendingRevenge.after + between(0.3, 2) * HOUR, day + 23 * HOUR) : session(day);
  pendingRevenge = null;

  const firstQty = notional / entryPrice;
  open.push({
    symbol,
    openedDay: day,
    rows: [fill(at, symbol, "buy", firstQty, entryPrice)],
    firstQty,
    qty: firstQty,
    cost: firstQty * entryPrice,
    lastBuy: entryPrice,
    adds: 0,
    takeProfit: between(0.025, 0.05),
    capitulate: between(0.11, 0.17),
    addGap: between(0.04, 0.06),
  });
}
// Positions still open when the price data runs out are dropped rather than left unfinished.

done.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
const header = "id,timestamp,symbol,side,qty,price,fee";
const csv =
  [
    header,
    ...done.map((r, k) => [`T${String(k + 1).padStart(4, "0")}`, r.timestamp, r.symbol, r.side, r.qty, r.price, r.fee].join(",")),
  ].join("\n") + "\n";
mkdirSync("public", { recursive: true });
writeFileSync("public/sample-trades.csv", csv);
console.log(`wrote public/sample-trades.csv — ${done.length} fills, ${new Set(done.map((r) => r.symbol)).size} symbols`);
