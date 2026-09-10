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
