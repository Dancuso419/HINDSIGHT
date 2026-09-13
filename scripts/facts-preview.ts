/** Print the sample's story: facts, tech vs other, per symbol, and the three replays. Run: npm run facts */
import { readFileSync } from "node:fs";
import { parseTrades, buildPositions } from "../src/lib/trades";
import { computeFacts } from "../src/lib/analysis";
import { replayNoAveragingDown, replayNoReentryAfterLoss, replayStopLoss } from "../src/lib/replay";
import { SAMPLE_SYMBOLS } from "./sample-symbols";
const priceFile = JSON.parse(readFileSync("data/prices.json", "utf8"));
const trades = parseTrades(readFileSync("public/sample-trades.csv", "utf8")).trades;
const ps = buildPositions(trades);
const f = computeFacts(ps);
const techSet = new Set<string>(SAMPLE_SYMBOLS.filter((x) => x.tech).map((x) => x.symbol));
const closed = ps.filter((p) => p.pnl !== null);
const grp = (xs: typeof closed) => ({ n: xs.length, wins: xs.filter((p) => p.pnl! > 0).length, pnl: +xs.reduce((a, p) => a + p.pnl!, 0).toFixed(2) });
console.log({ positions: f.positions, open: f.open, winRate: f.winRate, net: f.netPnl, from: trades[0].timestamp.slice(0,10), to: trades.at(-1)!.timestamp.slice(0,10) });
console.log("wins", { n: f.wins.count, pct: f.wins.avgPnlPct, hrs: f.wins.avgHoldHours }, "losses", { n: f.losses.count, pct: f.losses.avgPnlPct, hrs: f.losses.avgHoldHours });
console.log("averagedDown", { n: f.averagedDown.count, pnl: f.averagedDown.totalPnl, losingShare: f.averagedDown.losingShare }, "revenge", f.revengeTrades.count);
console.log("TECH", grp(closed.filter((p) => techSet.has(p.symbol))), "OTHER", grp(closed.filter((p) => !techSet.has(p.symbol))));
console.log("bySymbol", f.bySymbol.map((b) => `${b.symbol}:${b.positions}/${b.wins}w/${b.pnl}`).join("  "));
const candles = new Map(SAMPLE_SYMBOLS.map(({ symbol }) => [symbol, priceFile.symbols[symbol]]));
for (const r of [replayNoAveragingDown(ps, trades), replayNoReentryAfterLoss(ps), replayStopLoss(ps, candles, "snapshot")])
  console.log("REPLAY", r.id, r.status, "delta", r.delta, "n", r.affected.length, r.reason ?? "");
