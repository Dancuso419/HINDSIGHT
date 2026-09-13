import { readFileSync, writeFileSync } from "node:fs";
import { parseTrades } from "../src/lib/trades";
async function main() {
  const trades = parseTrades(readFileSync("public/sample-trades.csv", "utf8")).trades;
  const t = Date.now();
  const res = await fetch("http://localhost:3000/api/analyse", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trades, question: "Why do I keep losing money on tech-adjacent positions?" }),
  });
  const b = await res.json();
  console.log("HTTP", res.status, "in", Date.now() - t, "ms");
  if (!res.ok) return console.log(b);
  writeFileSync("F:/tmp/last-report.json", JSON.stringify(b, null, 2));
  for (const r of b.replays) console.log("REPLAY", r.id, r.status, "delta", r.delta, "n", r.affected.length, "source", r.source ?? "-", r.reason ?? "");
  console.log("MARKET", b.market.source, JSON.stringify(b.market.coverage), "lost@", b.market.avgIndexAtLosingEntries, "won@", b.market.avgIndexAtWinningEntries);
  console.log("\nHEADLINE:", b.report.headline);
  for (const p of b.report.patterns) console.log(`\n# ${p.title} [${p.confidence}] ${p.evidence.join(",")}\n  ${p.finding}\n  COST: ${p.cost}`);
  console.log("\nCHECKLIST:"); for (const c of b.report.checklist) console.log(" -", c);
  if (b.dropped?.length) console.log("DROPPED", b.dropped);
}
main();
