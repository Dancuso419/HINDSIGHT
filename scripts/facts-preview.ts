/** Print the computed facts for a CSV. Run: npx tsx scripts/facts-preview.ts [file] */
import { readFileSync } from "node:fs";
import { parseTrades, buildPositions } from "../src/lib/trades";
import { computeFacts } from "../src/lib/analysis";

const file = process.argv[2] ?? "public/sample-trades.csv";
const f = computeFacts(buildPositions(parseTrades(readFileSync(file, "utf8")).trades));
console.log(
  JSON.stringify(
    {
      positions: f.positions, winRate: f.winRate, netPnl: f.netPnl,
      wins: { n: f.wins.count, avgPct: f.wins.avgPnlPct, hrs: f.wins.avgHoldHours },
      losses: { n: f.losses.count, avgPct: f.losses.avgPnlPct, hrs: f.losses.avgHoldHours },
      averagedDown: { n: f.averagedDown.count, pnl: f.averagedDown.totalPnl, losingShare: f.averagedDown.losingShare },
      revenge: f.revengeTrades.count,
      bySymbol: f.bySymbol.map((s) => [s.symbol, s.positions, s.wins, s.pnl]),
    },
    null,
    1,
  ),
);
