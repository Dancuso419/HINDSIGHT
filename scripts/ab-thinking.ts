/**
 * Measure how thinking_level changes latency and output validity on the real sample prompt.
 * Spends Gemini requests. Run: npx tsx scripts/ab-thinking.ts
 */
import { readFileSync } from "node:fs";
import { parseTrades, buildPositions } from "../src/lib/trades";
import { computeFacts } from "../src/lib/analysis";
import { replayNoAveragingDown, replayNoReentryAfterLoss } from "../src/lib/replay";
import { entrySentiment, parseSentiment } from "../src/lib/market";
import { ReportSchema } from "../src/lib/report";
import { buildInput, callModel, type ThinkingLevel } from "../src/lib/gemini";

const apiKey = readFileSync(".env.local", "utf8").match(/GEMINI_API_KEY=(.+)/)![1].trim();
const trades = parseTrades(readFileSync("public/sample-trades.csv", "utf8")).trades;
const positions = buildPositions(trades);
const input = buildInput({
  question: "Why do I keep losing money on tech-adjacent positions?",
  facts: computeFacts(positions),
  replays: [replayNoAveragingDown(positions, trades), replayNoReentryAfterLoss(positions)],
  market: entrySentiment(positions, parseSentiment(JSON.parse(readFileSync("data/fng-snapshot.json", "utf8"))), "snapshot"),
  positions,
});
console.log("prompt chars", input.length);

async function run(model: string, level?: ThinkingLevel) {
  const t = Date.now();
  try {
    const r = await callModel({ apiKey, model, input, timeoutMs: Number(process.env.CAP ?? 110_000), thinkingLevel: level });
    const ms = Date.now() - t;
    if (!r.ok) return console.log(`${model} ${level ?? "default"}: HTTP ${r.status} in ${ms}ms ${r.detail.slice(0, 120)}`);
    let valid = false;
    try { valid = ReportSchema.safeParse(JSON.parse(r.text)).success; } catch {}
    console.log(`${model} ${level ?? "default"}: ${ms}ms, schema-valid ${valid}`);
    if (valid && process.env.SHOW) {
      const rep = JSON.parse(r.text);
      console.log(`  HEADLINE: ${rep.headline}`);
      for (const p of rep.patterns) console.log(`  # ${p.title} [${p.evidence.join(",")}]
    ${p.finding}
    COST: ${p.cost}`);
      for (const c of rep.checklist) console.log(`  - ${c}`);
    }
  } catch (e) {
    console.log(`${model} ${level ?? "default"}: FAILED after ${Date.now() - t}ms — ${(e as Error).name}`);
  }
}

async function main() {
  const only = process.env.MODELS?.split(",");
  const plan: [string, ThinkingLevel | undefined][] = only
    ? only.map((m) => m.split(":") as [string, ThinkingLevel])
    : [["gemini-3.8-flash", "low"], ["gemini-3.8-flash", undefined], ["gemini-3.1-flash-lite", "low"]];
  for (const [model, level] of plan) await run(model, level);
}
main();
