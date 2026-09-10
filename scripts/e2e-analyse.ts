/** End-to-end check of the graded demo path against a running dev server.
 * Run: npm run dev, then npm run e2e
 */
import { readFileSync } from "node:fs";
import { parseTrades } from "../src/lib/trades";

async function main() {
  const trades = parseTrades(readFileSync("public/sample-trades.csv", "utf8")).trades;
  const res = await fetch("http://localhost:3000/api/analyse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trades, question: "Why do I keep losing money on tech-adjacent positions?" }),
  });
  const body = await res.json();
  console.log("HTTP", res.status);
  console.log(JSON.stringify(body.report ?? body, null, 2).slice(0, 4000));
  if (body.dropped?.length) console.log("DROPPED CITATIONS:", body.dropped);
}
main();
