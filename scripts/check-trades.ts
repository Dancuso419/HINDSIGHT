/** Self-check for the parser. Run: npm run check */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseTrades, summarise } from "../src/lib/trades";

// 1. the generated sample parses clean
const sample = parseTrades(readFileSync("public/sample-trades.csv", "utf8"));
assert.equal(sample.errors.length, 0, `sample has parse errors: ${JSON.stringify(sample.errors)}`);
assert.ok(sample.trades.length > 40, "sample should have a usable number of trades");
assert.ok(sample.trades.some((t) => t.side === "sell"), "sample should contain exits");

// 2. header aliases, messy values, missing fee and missing id all normalise
const messy = parseTrades(
  `Date,Pair,Direction,Quantity,Fill Price\n2026-06-01 13:35,btc,B,0.01,"61,200.50"\n2026-06-02T09:00:00Z,ETH,SELL,1.5,3350`,
);
assert.deepEqual(messy.errors, []);
assert.equal(messy.trades.length, 2);
assert.equal(messy.trades[0].symbol, "BTC");
assert.equal(messy.trades[0].side, "buy");
assert.equal(messy.trades[0].price, 61200.5);
assert.equal(messy.trades[0].fee, 0);
assert.equal(messy.trades[0].id, "t1"); // id generated when the export has none

// 3. bad rows are reported, not silently dropped or silently kept
const bad = parseTrades(`timestamp,symbol,side,qty,price\nnot-a-date,BTC,buy,1,100\n2026-06-01T00:00:00Z,BTC,hodl,1,100\n2026-06-01T00:00:00Z,BTC,buy,-1,100`);
assert.equal(bad.trades.length, 0);
assert.equal(bad.errors.length, 3);
assert.equal(bad.errors[0].row, 2);

// 4. trades come back in time order regardless of file order
const unsorted = parseTrades(`timestamp,symbol,side,qty,price\n2026-06-05T00:00:00Z,BTC,buy,1,100\n2026-06-01T00:00:00Z,ETH,buy,1,100`);
assert.equal(unsorted.trades[0].symbol, "ETH");
assert.equal(summarise(unsorted.trades).count, 2);

console.log("ok — parser checks pass");

// --- positions, facts, citation guard ---
import { buildPositions } from "../src/lib/trades";
import { computeFacts } from "../src/lib/analysis";
import { enforceCitations, type Report } from "../src/lib/report";

const positions = buildPositions(sample.trades);
assert.ok(positions.length >= 20, `expected round trips, got ${positions.length}`);
assert.ok(positions.every((p) => p.tradeIds.length >= 2), "every closed position needs an entry and an exit");

// a two-buy, one-sell position averages down and nets out
const p = buildPositions(
  parseTrades(
    `id,timestamp,symbol,side,qty,price,fee\nA,2026-06-01T00:00:00Z,BTC,buy,1,100,1\nB,2026-06-02T00:00:00Z,BTC,buy,1,80,1\nC,2026-06-03T00:00:00Z,BTC,sell,2,90,1`,
  ).trades,
)[0];
assert.equal(p.avgEntry, 90);
assert.equal(p.addsDown, 1);
assert.equal(p.pnl, -3); // flat on price, down on the three fees
assert.equal(p.holdHours, 48);
assert.deepEqual(p.tradeIds, ["A", "B", "C"]);

const facts = computeFacts(positions);
assert.equal(facts.positions, positions.filter((x) => x.pnl !== null).length);
assert.ok(facts.wins.avgPnlPct > 0 && facts.losses.avgPnlPct < 0, "sample should show wins up, losses down");
assert.ok(
  Math.abs(facts.losses.avgPnlPct) > facts.wins.avgPnlPct,
  "sample is built so losses run further than winners",
);
assert.ok(facts.averagedDown.count > 0, "sample should contain averaging down");

// fabricated citations are stripped, and a pattern left with none is dropped entirely
const fabricated: Report = {
  headline: "You cut winners early and hold losers.",
  patterns: [
    { title: "Real pattern cited", finding: "x".repeat(50), cost: "y".repeat(30), evidence: ["P01", "T9999"], confidence: "high" },
    { title: "Entirely made up claim", finding: "x".repeat(50), cost: "y".repeat(30), evidence: ["P99", "NOPE"], confidence: "low" },
  ],
  checklist: ["a".repeat(20), "b".repeat(20), "c".repeat(20)],
};
const guarded = enforceCitations(fabricated, new Set([...positions.map((x) => x.id), ...sample.trades.map((t) => t.id)]));
assert.equal(guarded.report.patterns.length, 1, "pattern with no real evidence must be dropped");
assert.deepEqual(guarded.report.patterns[0].evidence, ["P01"]);
assert.deepEqual(guarded.dropped.sort(), ["NOPE", "P99", "T9999"]);

console.log(`ok — positions (${positions.length}), facts and citation guard pass`);

// --- evidence ids resolve to the position rows the report points at ---
import { resolveEvidence } from "../src/lib/report";

const withFills = positions.find((x) => x.tradeIds.length >= 3)!;
const byPosition = resolveEvidence(positions, [withFills.id], withFills.id);
assert.equal(byPosition.focused, withFills.id);
assert.ok(byPosition.selected.has(withFills.id));

// a citation naming a single fill must light up the position that contains it
const byTrade = resolveEvidence(positions, [withFills.tradeIds[1]], withFills.tradeIds[1]);
assert.equal(byTrade.focused, withFills.id, "a trade id must resolve to its position row");
assert.ok(byTrade.selected.has(withFills.id));

// an id belonging to neither highlights nothing and scrolls nowhere
const unknown = resolveEvidence(positions, ["NOPE"], "NOPE");
assert.equal(unknown.focused, null);
assert.deepEqual([...unknown.selected], ["NOPE"]);

console.log("ok — evidence resolves to position rows");
