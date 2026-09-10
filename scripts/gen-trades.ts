/**
 * Synthetic trade history for the demo. Deterministic (seeded) so the demo never shifts.
 * The data deliberately contains the patterns the report is meant to find:
 *   - winners cut at ~+4%, losers held to ~-12%
 *   - averaging down into the biggest losers
 *   - a revenge trade (2-3x size, within an hour) after a big loss
 *   - the losses cluster in tech-adjacent symbols
 * Run: npm run gen:trades
 */
import { writeFileSync, mkdirSync } from "node:fs";

const seed = 20260921;
let s = seed;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];

const TECH = ["NVDA", "TSLA", "COIN", "MSTR"];
const CRYPTO = ["BTC", "ETH", "SOL"];
const BASE: Record<string, number> = {
  NVDA: 118, TSLA: 245, COIN: 210, MSTR: 165, BTC: 61200, ETH: 3350, SOL: 148,
};

type Row = { id: string; timestamp: string; symbol: string; side: string; qty: number; price: number; fee: number };

const rows: Row[] = [];
let n = 0;
const push = (at: Date, symbol: string, side: "buy" | "sell", qty: number, price: number) =>
  rows.push({
    id: `T${String(++n).padStart(4, "0")}`,
    timestamp: at.toISOString(),
    symbol,
    side,
    qty: Number(qty.toFixed(4)),
    price: Number(price.toFixed(2)),
    fee: Number((qty * price * 0.0006).toFixed(2)),
  });

const HOUR = 3600_000;
let clock = new Date("2026-06-01T13:35:00Z").getTime();
const step = (hours: number) => (clock += hours * HOUR);

let lastLoss = 0; // notional of the most recent loss, drives the revenge trade
let revengePending = false;

for (let i = 0; i < 26; i++) {
  // tech-adjacent positions lose far more often than crypto ones
  const tech = rnd() < 0.55;
  const symbol = tech ? pick(TECH) : pick(CRYPTO);
  const wins = rnd() < (tech ? 0.3 : 0.6);

  const entry = BASE[symbol] * between(0.9, 1.1);
  const isRevenge = revengePending;
  revengePending = false;
  const notional = isRevenge ? lastLoss * between(2, 3) : between(300, 900);
  const qty = notional / entry;

  // straight back in after a loss, or a normal gap between positions
  step(isRevenge ? between(0.3, 2) : between(6, 60));
  const opened = new Date(clock);
  push(opened, symbol, "buy", qty, entry);

  let totalQty = qty;
  let cost = qty * entry;

  if (!wins) {
    // average down once or twice while it goes against us
    const adds = rnd() < 0.7 ? (rnd() < 0.4 ? 2 : 1) : 0;
    for (let a = 0; a < adds; a++) {
      step(between(2, 30));
      const addPrice = entry * between(0.93, 0.97) ** (a + 1);
      const addQty = qty * between(0.8, 1.4);
      push(new Date(clock), symbol, "buy", addQty, addPrice);
      totalQty += addQty;
      cost += addQty * addPrice;
    }
  }

  const avg = cost / totalQty;
  // winners cut early and small, losers held to a deep stop-out
  const exit = wins ? avg * between(1.02, 1.06) : avg * between(0.82, 0.92);
  step(wins ? between(1, 12) : between(24, 120));
  push(new Date(clock), symbol, "sell", totalQty, exit);

  const pnl = totalQty * (exit - avg);
  if (pnl < -60 && rnd() < 0.6) {
    lastLoss = Math.abs(pnl) * 4;
    revengePending = true;
  }
}

const header = "id,timestamp,symbol,side,qty,price,fee";
const csv = [header, ...rows.map((r) => Object.values(r).join(","))].join("\n") + "\n";
mkdirSync("public", { recursive: true });
writeFileSync("public/sample-trades.csv", csv);
console.log(`wrote public/sample-trades.csv — ${rows.length} trades, ${new Set(rows.map((r) => r.symbol)).size} symbols`);
