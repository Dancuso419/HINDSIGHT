/**
 * Measure screenshot extraction against screenshots whose ground truth is known exactly:
 * F:\tmp\screen-desktop.png shows sample fills T0001-T0012 (full timestamps);
 * F:\tmp\screen-mobile.png shows T0013-T0018 as phone cards with no year.
 * Spends Gemini requests. Run: npx tsx scripts/eval-extract.ts
 */
import { readFileSync } from "node:fs";
import { parseTrades } from "../src/lib/trades";
import { extractTrades, toReviewRow, rowTimestamp, type ExtractedRow } from "../src/lib/extract";

const apiKey = readFileSync(".env.local", "utf8").match(/GEMINI_API_KEY=(.+)/)![1].trim();
const truth = parseTrades(readFileSync("public/sample-trades.csv", "utf8")).trades;

const cases = [
  { file: "F:/tmp/screen-desktop.png", rows: truth.slice(0, 12), hasYear: true, hasSeconds: true, hasFee: true },
  { file: "F:/tmp/screen-mobile.png", rows: truth.slice(12, 18), hasYear: false, hasSeconds: false, hasFee: false },
];

const close = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) < 1e-6;

async function main() {
  const attempts = process.env.MODEL
    ? [{ model: process.env.MODEL, thinkingLevel: (process.env.LEVEL ?? "low") as "low", capMs: 60_000 }]
    : undefined;
  let fields = 0;
  let correct = 0;
  let guessedYears = 0;

  for (const c of cases) {
    const t0 = Date.now();
    const r = await extractTrades({
      apiKey,
      images: [{ data: readFileSync(c.file).toString("base64"), mime_type: "image/png" }],
      deadlineMs: 70_000,
      attempts,
    });
    if (!r.ok) {
      console.log(`${c.file}: FAILED — ${r.error}`);
      continue;
    }
    const got = r.extraction.rows;
    console.log(`\n${c.file.split("/").pop()} via ${r.model} in ${Date.now() - t0}ms — rows ${got.length}/${c.rows.length}`);

    c.rows.forEach((want, i) => {
      const g: ExtractedRow | undefined = got[i];
      const checks: [string, boolean][] = g
        ? [
            ["symbol", g.symbol.toUpperCase().replace(/\/?USDT$/, "") === want.symbol],
            ["side", g.side === want.side],
            ["qty", close(g.qty, want.qty)],
            ["price", close(g.price, want.price)],
            ...(c.hasFee ? ([["fee", close(g.fee, want.fee)]] as [string, boolean][]) : []),
            [
              "datetime",
              (() => {
                const ts = rowTimestamp({ date: g.date, time: g.time ?? "" }, c.hasYear ? "" : want.timestamp.slice(0, 4));
                const cut = c.hasSeconds ? 19 : 16;
                return ts !== null && ts.slice(0, cut) === want.timestamp.slice(0, cut);
              })(),
            ],
          ]
        : [["row missing", false]];
      if (g && !c.hasYear && /\b(19|20)\d{2}\b/.test(g.date)) guessedYears++;
      fields += checks.length;
      correct += checks.filter(([, ok]) => ok).length;
      const wrong = checks.filter(([, ok]) => !ok).map(([k]) => k);
      if (wrong.length) console.log(`  ${want.id}: wrong ${wrong.join(", ")} — got ${JSON.stringify(g)}`);
    });

    const review = got.map(toReviewRow);
    console.log(`  flagged "year not shown": ${review.filter((x) => x.issues.some((i) => /year/i.test(i))).length} rows`);
    if (r.extraction.notes.length) console.log(`  notes: ${r.extraction.notes.join(" | ")}`);
  }

  console.log(`\nFIELD ACCURACY ${correct}/${fields} (${((correct / fields) * 100).toFixed(1)}%) · years invented on year-less screenshots: ${guessedYears}`);
}
main();
