import type { Candle } from "./replay";

/**
 * Daily candles from Yahoo Finance's public chart endpoint — no key. Used as the fallback
 * price source when the bitget-signal Skills cannot answer.
 */
export async function yahooDaily(symbol: string, range: "6mo" | "1y" | "2y" = "1y", timeoutMs = 8_000): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`Yahoo ${symbol}: ${res.status}`);

  const body = (await res.json()) as {
    chart?: {
      result?: {
        timestamp?: number[];
        indicators?: { quote?: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }[] };
      }[];
    };
  };
  const r = body.chart?.result?.[0];
  const q = r?.indicators?.quote?.[0];
  if (!r?.timestamp || !q) return [];

  const out: Candle[] = [];
  r.timestamp.forEach((ts, i) => {
    const [open, high, low, close] = [q.open?.[i], q.high?.[i], q.low?.[i], q.close?.[i]];
    if (open == null || high == null || low == null || close == null) return; // halted / partial day
    const d = new Date(ts * 1000);
    const round = (n: number) => Number(n.toFixed(4));
    out.push({
      t: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
    });
  });
  return out;
}
