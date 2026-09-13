/**
 * Download real daily prices for the sample history's symbols and commit them as
 * data/prices.json. The sample generator trades only inside these real daily ranges, and the
 * stop-loss replay uses them as its last fallback. Source: Yahoo Finance public chart API.
 * Run: npm run fetch:prices
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { SAMPLE_SYMBOLS } from "./sample-symbols";
import { yahooDaily } from "../src/lib/yahoo";

async function main() {
  mkdirSync("data", { recursive: true });
  const symbols: Record<string, Awaited<ReturnType<typeof yahooDaily>>> = {};
  for (const { symbol } of SAMPLE_SYMBOLS) {
    const candles = await yahooDaily(symbol, "1y");
    if (candles.length < 100) throw new Error(`${symbol}: only ${candles.length} candles — refusing to write a thin price file`);
    symbols[symbol] = candles;
    const first = new Date(candles[0].t).toISOString().slice(0, 10);
    const last = new Date(candles.at(-1)!.t).toISOString().slice(0, 10);
    console.log(`${symbol.padEnd(5)} ${candles.length} days  ${first} → ${last}`);
  }
  // One file, so the server can import it and it ships with the deployment.
  writeFileSync("data/prices.json", JSON.stringify({ source: "Yahoo Finance", fetchedAt: new Date().toISOString(), symbols }) + "\n");
}
main();
