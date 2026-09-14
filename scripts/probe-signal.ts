/**
 * Probe the bitget-signal Skills the replay and market-context features depend on.
 * Prints the shape and date coverage of each response. Run: npx tsx scripts/probe-signal.ts
 */
import { callSkillOnce } from "../src/lib/signal";

const preview = (v: unknown) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 700 ? `${s.slice(0, 700)}… (${s.length} chars)` : s;
};

async function probe(label: string, tool: string, args: Record<string, unknown>) {
  const t = Date.now();
  try {
    const out = await callSkillOnce(tool, args);
    console.log(`\n=== ${label} — ok in ${Date.now() - t}ms\n${preview(out)}`);
  } catch (e) {
    console.log(`\n=== ${label} — FAILED in ${Date.now() - t}ms: ${(e as Error).message}`);
  }
}

async function main() {
  await probe("fear & greed history (120d)", "sentiment_index", { action: "history", days: 120 });
  await probe("SOL daily ohlcv (120d)", "crypto_market", { action: "ohlcv", coin_id: "solana", vs_currency: "usd", days: 120 });
  await probe("NVDA ohlcv", "global_assets", { action: "ohlcv", symbol: "NVDA", period: "6mo", interval: "1d" });
  // Controls: tools Hindsight does not use, to tell a partial outage from a total one.
  await probe("control: fear & greed current", "sentiment_index", { action: "current" });
  await probe("control: BTC price", "crypto_price", { action: "price", symbol: "BTC" });
  await probe("control: technical analysis", "technical_analysis", { action: "rsi", symbol: "BTC/USDT", timeframe: "1d" });
  await probe("control: news feed", "news_feed", { action: "latest", limit: 1 });
  await probe("control: macro indicators", "macro_indicators", { action: "series_list" });
}
main();
