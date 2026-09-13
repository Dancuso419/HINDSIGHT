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

// --- replay: the history re-run with one rule applied ---
import { replayNoAveragingDown, replayNoReentryAfterLoss, replayStopLoss, type Candle } from "../src/lib/replay";
import { parseSentiment, parseCandles, entrySentiment } from "../src/lib/market";

{
  // Buy 1 @100, add 1 @80 (below entry), sell 2 @90, $1 fee each.
  const t = parseTrades(
    `id,timestamp,symbol,side,qty,price,fee\nA,2026-06-01T00:00:00Z,BTC,buy,1,100,1\nB,2026-06-02T00:00:00Z,BTC,buy,1,80,1\nC,2026-06-03T00:00:00Z,BTC,sell,2,90,1`,
  ).trades;
  const r = replayNoAveragingDown(buildPositions(t), t);
  assert.equal(r.affected.length, 1);
  assert.equal(r.affected[0].actual, -3); // 180 − 180 − 3 fees
  // Without the add: 1 @100 exits @90 → −10, minus buy fee 1, minus half the sell fee 0.5
  assert.equal(r.affected[0].replayed, -11.5);
  assert.equal(r.delta, -8.5, "an add that lowered the average helped here, so the rule costs money — reported as such");
}
{
  // An add ABOVE entry is not averaging down and must not be touched.
  const t = parseTrades(
    `id,timestamp,symbol,side,qty,price,fee\nA,2026-06-01T00:00:00Z,BTC,buy,1,100,0\nB,2026-06-02T00:00:00Z,BTC,buy,1,110,0\nC,2026-06-03T00:00:00Z,BTC,sell,2,120,0`,
  ).trades;
  assert.equal(replayNoAveragingDown(buildPositions(t), t).affected.length, 0);
}

const avgDown = replayNoAveragingDown(positions, sample.trades);
assert.ok(avgDown.affected.length >= facts.averagedDown.count, "every averaged-down position is replayed");
assert.ok(avgDown.delta > 0, "on the sample, not averaging down saves money");

const reentry = replayNoReentryAfterLoss(positions);
assert.ok(reentry.affected.length >= facts.revengeTrades.count, "revenge trades are a subset of re-entries");
assert.ok(reentry.affected.every((a) => a.replayed === 0), "skipped trades replay to zero");

{
  // Stop at −5%: entry 100 on day 1, low 94 on day 3, actual exit day 6 at 80.
  const t = parseTrades(
    `id,timestamp,symbol,side,qty,price,fee\nA,2026-06-01T10:00:00Z,SOL,buy,10,100,0\nB,2026-06-06T10:00:00Z,SOL,sell,10,80,0`,
  ).trades;
  const day = (d: number) => Date.UTC(2026, 5, d);
  const candles: Candle[] = [1, 2, 3, 4, 5, 6].map((d) => ({ t: day(d), open: 100, high: 101, low: d === 3 ? 94 : 97, close: 99 }));
  const r = replayStopLoss(buildPositions(t), new Map([["SOL", candles]]), "test");
  assert.equal(r.status, "computed");
  assert.equal(r.affected[0].actual, -200);
  assert.equal(r.affected[0].replayed, -50); // 10 × (95 − 100)
  assert.equal(r.delta, 150);

  // Guard: a file whose prices are nowhere near the market's is refused, not replayed.
  const off: Candle[] = candles.map((c) => ({ ...c, open: 20, high: 21, low: 19, close: 20 }));
  const refused = replayStopLoss(buildPositions(t), new Map([["SOL", off]]), "test");
  assert.equal(refused.status, "unavailable");
  assert.equal(refused.affected.length, 0);
}

// --- market data parsing accepts the shapes the sources return ---
{
  const alt = parseSentiment({ data: [{ value: "61", value_classification: "Greed", timestamp: "1789257600" }] });
  assert.equal(alt.size, 1);
  assert.equal([...alt.values()][0].value, 61);
  assert.equal(parseSentiment({ error: "" }).size, 0, "the Skill's empty error payload parses to nothing, triggering fallback");

  const arr = parseCandles({ ohlcv: [[1780000000000, 1, 2, 0.5, 1.5], [1780003600000, 1.5, 3, 1, 2]] });
  assert.equal(arr.length, 1, "intraday candles merge into one daily bar");
  assert.equal(arr[0].high, 3);
  assert.equal(arr[0].low, 0.5);
  assert.equal(arr[0].close, 2);
  const objs = parseCandles([{ date: "2026-06-01", open: 1, high: 2, low: 0.5, close: 1.5 }]);
  assert.equal(objs.length, 1);
}

// --- sentiment at entry, against the committed snapshot ---
{
  const snap = parseSentiment(JSON.parse(readFileSync("data/fng-snapshot.json", "utf8")));
  const ctx = entrySentiment(positions, snap, "snapshot");
  assert.equal(ctx.coverage.matched, ctx.coverage.of, "snapshot covers every sample entry date");
  assert.equal(ctx.bands.reduce((s, b) => s + b.opened, 0), ctx.coverage.matched);
}

console.log(
  `ok — replay (avg-down ${avgDown.delta >= 0 ? "+" : ""}${avgDown.delta}, re-entry ${reentry.delta >= 0 ? "+" : ""}${reentry.delta}), stop-loss, parsers, entry sentiment`,
);
