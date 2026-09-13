import { callSkill } from "./signal";
import type { Candle } from "./replay";
import type { Position } from "./trades";
import snapshot from "../../data/fng-snapshot.json";
import savedPricesFile from "../../data/prices.json";
import { yahooDaily } from "./yahoo";

const savedPrices = savedPricesFile as { source: string; symbols: Record<string, Candle[]> };

/**
 * Market context for each decision, from the bitget-signal Skills when they answer and
 * from a fallback when they don't. Nothing needs switching by hand: every request tries
 * the Skill first, so the moment the Skill recovers it is used again.
 */

export type Sentiment = { value: number; label: string };
export type SentimentSource = "bitget-signal" | "alternative.me" | "snapshot";

const DAY = 86_400_000;
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Accepts the alternative.me shape and anything the Skill wraps it in. */
export function parseSentiment(raw: unknown): Map<string, Sentiment> {
  const out = new Map<string, Sentiment>();
  const find = (v: unknown): unknown[] | null => {
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      for (const key of ["data", "history", "values", "result", "items"]) {
        const inner = (v as Record<string, unknown>)[key];
        const hit = find(inner);
        if (hit) return hit;
      }
    }
    return null;
  };
  for (const row of find(raw) ?? []) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const value = Number(r.value ?? r.fng_value ?? r.index);
    const label = String(r.value_classification ?? r.classification ?? r.label ?? "");
    const ts = r.timestamp ?? r.time ?? r.date;
    const ms = typeof ts === "string" && /^\d{4}-\d{2}-\d{2}/.test(ts) ? Date.parse(ts) : Number(ts) * (Number(ts) < 1e12 ? 1000 : 1);
    if (!Number.isFinite(value) || !Number.isFinite(ms) || !label) continue;
    out.set(dayKey(ms), { value, label });
  }
  return out;
}

let cached: { at: number; source: SentimentSource; byDay: Map<string, Sentiment> } | null = null;

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

/** Fear & Greed by day, covering `days` back from today. */
export async function getSentiment(days: number, budgetMs = 9_000): Promise<{
  source: SentimentSource;
  byDay: Map<string, Sentiment>;
}> {
  // ponytail: one in-memory hour of cache per server instance; the index updates daily.
  if (cached && Date.now() - cached.at < 3_600_000 && cached.byDay.size >= Math.min(days, 30)) return cached;

  const want = Math.min(Math.max(days, 7), 365);
  const tries: [SentimentSource, () => Promise<unknown>][] = [
    // The Skill gets a sub-budget so a slow failure still leaves time for the fallback.
    ["bitget-signal", () => withTimeout(callSkill("sentiment_index", { action: "history", days: want }), 5_000)],
    [
      "alternative.me",
      () =>
        fetch(`https://api.alternative.me/fng/?limit=${want}&format=json`, { signal: AbortSignal.timeout(6_000) }).then(
          (r) => r.json(),
        ),
    ],
  ];

  const deadline = Date.now() + budgetMs;
  for (const [source, get] of tries) {
    const left = deadline - Date.now();
    if (left < 500) break;
    try {
      const byDay = parseSentiment(await withTimeout(get(), left));
      if (byDay.size > 0) {
        cached = { at: Date.now(), source, byDay };
        return { source, byDay };
      }
    } catch {
      // fall through to the next source
    }
  }

  return { source: "snapshot", byDay: parseSentiment(snapshot) };
}

const BAND = (v: number) => (v <= 24 ? "Extreme Fear" : v <= 44 ? "Fear" : v <= 55 ? "Neutral" : v <= 74 ? "Greed" : "Extreme Greed");

/** Sentiment on the day each position was opened, and how winners and losers split across it. */
export function entrySentiment(positions: Position[], byDay: Map<string, Sentiment>, source: SentimentSource) {
  const closed = positions.filter((p) => p.pnl !== null);
  const entries = closed
    .map((p) => {
      const s = byDay.get(p.openedAt.slice(0, 10));
      return s ? { id: p.id, value: s.value, band: BAND(s.value), won: p.pnl! > 0, pnl: p.pnl! } : null;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const bands = ["Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"].map((band) => {
    const inBand = entries.filter((e) => e.band === band);
    return {
      band,
      opened: inBand.length,
      lost: inBand.filter((e) => !e.won).length,
      pnl: Number(inBand.reduce((s, e) => s + e.pnl, 0).toFixed(2)),
      positionIds: inBand.map((e) => e.id),
    };
  });

  const losers = entries.filter((e) => !e.won);
  const winners = entries.filter((e) => e.won);
  const avg = (xs: { value: number }[]) => (xs.length ? Number((xs.reduce((s, e) => s + e.value, 0) / xs.length).toFixed(1)) : null);

  return {
    source,
    coverage: { matched: entries.length, of: closed.length },
    avgIndexAtLosingEntries: avg(losers),
    avgIndexAtWinningEntries: avg(winners),
    bands,
    entries,
  };
}

export type EntrySentiment = ReturnType<typeof entrySentiment>;

/* ------------------------------------------------------------------ historical prices */

const CRYPTO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  DOGE: "dogecoin",
  ADA: "cardano",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  BGB: "bitget-token",
};

/** Accepts [[ts, o, h, l, c], …] or [{timestamp|time|date, open, high, low, close}, …], nested anywhere. */
export function parseCandles(raw: unknown): Candle[] {
  const rows = ((): unknown[] => {
    const seen = new Set<unknown>();
    const walk = (v: unknown): unknown[] | null => {
      if (!v || seen.has(v)) return null;
      if (Array.isArray(v)) return v.length && (Array.isArray(v[0]) || typeof v[0] === "object") ? v : null;
      if (typeof v === "object") {
        seen.add(v);
        for (const inner of Object.values(v as Record<string, unknown>)) {
          const hit = walk(inner);
          if (hit) return hit;
        }
      }
      return null;
    };
    return walk(raw) ?? [];
  })();

  const candles: Candle[] = [];
  for (const row of rows) {
    let t: number, open: number, high: number, low: number, close: number;
    if (Array.isArray(row)) {
      [t, open, high, low, close] = row.map(Number) as number[];
    } else if (row && typeof row === "object") {
      const r = row as Record<string, unknown>;
      const ts = r.timestamp ?? r.time ?? r.date ?? r.t;
      t = typeof ts === "string" && !/^\d+$/.test(ts) ? Date.parse(ts) : Number(ts);
      open = Number(r.open ?? r.o);
      high = Number(r.high ?? r.h);
      low = Number(r.low ?? r.l);
      close = Number(r.close ?? r.c);
    } else continue;
    if (t < 1e12) t *= 1000;
    if (![t, open, high, low, close].every(Number.isFinite)) continue;
    const day = new Date(t);
    candles.push({ t: Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()), open, high, low, close });
  }

  // CoinGecko-style ranges return several candles per day; merge them into one daily bar.
  const byDay = new Map<number, Candle>();
  for (const c of candles.sort((a, b) => a.t - b.t)) {
    const d = byDay.get(c.t);
    if (!d) byDay.set(c.t, { ...c });
    else byDay.set(c.t, { ...d, high: Math.max(d.high, c.high), low: Math.min(d.low, c.low), close: c.close });
  }
  return [...byDay.values()];
}

export type PriceSource = "bitget-signal" | "Yahoo Finance" | "saved prices";

/**
 * Daily candles for each symbol, per symbol from the first source that answers:
 * bitget-signal → Yahoo Finance → the committed price file. While the Skills are cooling
 * down after a failure they are skipped instantly, so a symbol falls through fast; once they
 * recover, they are used first again.
 */
export async function getCandles(
  positions: Position[],
  budgetMs = 9_000,
): Promise<{ candles: Map<string, Candle[]>; sources: PriceSource[] }> {
  const closed = positions.filter((p) => p.closedAt);
  if (!closed.length) return { candles: new Map(), sources: [] };
  const earliest = Math.min(...closed.map((p) => Date.parse(p.openedAt)));
  const days = Math.min(365, Math.ceil((Date.now() - earliest) / DAY) + 2);
  const covers = (c: Candle[]) => c.length > 0 && c[0].t <= earliest;

  const fromSkill = async (symbol: string) => {
    const coin = CRYPTO_IDS[symbol];
    const raw = coin
      ? await callSkill("crypto_market", { action: "ohlcv", coin_id: coin, vs_currency: "usd", days })
      : await callSkill("global_assets", { action: "ohlcv", symbol, period: days > 180 ? "1y" : "6mo", interval: "1d" });
    return parseCandles(raw);
  };

  const fetchOne = async (symbol: string): Promise<[string, Candle[], PriceSource] | null> => {
    const tries: [PriceSource, () => Promise<Candle[]>][] = [
      ["bitget-signal", () => withTimeout(fromSkill(symbol), 4_000)],
      ["Yahoo Finance", () => yahooDaily(symbol, days > 180 ? "1y" : "6mo", 4_000)],
      ["saved prices", async () => savedPrices.symbols[symbol] ?? []],
    ];
    for (const [source, get] of tries) {
      try {
        const candles = await get();
        if (covers(candles)) return [symbol, candles, source];
      } catch {
        // next source
      }
    }
    return null;
  };

  const symbols = [...new Set(closed.map((p) => p.symbol))];
  const settled = await withTimeout(Promise.all(symbols.map(fetchOne)), budgetMs).catch(() => [] as null[]);
  const candles = new Map<string, Candle[]>();
  const sources = new Set<PriceSource>();
  for (const hit of settled) {
    if (!hit) continue;
    candles.set(hit[0], hit[1]);
    sources.add(hit[2]);
  }
  return { candles, sources: [...sources] };
}

export { DAY };
