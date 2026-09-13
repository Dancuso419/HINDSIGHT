/**
 * Probe the bitget-signal Skills the replay and market-context features depend on.
 * Prints the shape and date coverage of each response. Run: npx tsx scripts/probe-signal.ts
 */
import { callSkill } from "../src/lib/signal";

const preview = (v: unknown) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 700 ? `${s.slice(0, 700)}… (${s.length} chars)` : s;
};

async function probe(label: string, tool: string, args: Record<string, unknown>) {
  const t = Date.now();
  try {
    const out = await callSkill(tool, args);
    console.log(`\n=== ${label} — ok in ${Date.now() - t}ms\n${preview(out)}`);
  } catch (e) {
    console.log(`\n=== ${label} — FAILED in ${Date.now() - t}ms: ${(e as Error).message}`);
  }
}

async function main() {
  await probe("fear & greed history (120d)", "sentiment_index", { action: "history", days: 120 });
  await probe("SOL daily ohlcv (120d)", "crypto_market", { action: "ohlcv", coin_id: "solana", vs_currency: "usd", days: 120 });
  await probe("NVDA ohlcv", "global_assets", { action: "ohlcv", symbol: "NVDA", period: "6mo", interval: "1d" });
}
main();
