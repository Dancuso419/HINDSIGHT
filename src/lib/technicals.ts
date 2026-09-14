import { z } from "zod";
import { callSkill } from "./signal";

/**
 * Today's technical picture for each symbol the trader traded, from the bitget-signal
 * technical-analysis Skill. Context shown beside the post-mortem — never sent to the model,
 * which reviews decisions, not the market.
 *
 * Deliberately NOT surfaced, though the Skill returns them:
 *   - bollinger: upper and lower bands arrive swapped (upper < lower, negative bandwidth), so
 *     the band position it reports is inverted. Observed on every symbol on 2026-09-14.
 *   - verdict / bull_signals / bear_signals: a directional call, partly built on those bands.
 *   - atr.suggested_stop: trading advice.
 */

const num = z.number().finite();

const Payload = z.object({
  rsi: z.object({ rsi: num.min(0).max(100) }),
  macd: z.object({ histogram: num, cross: z.string().optional() }),
  ma: z.object({ price: num.positive(), ma7: num.positive(), ma25: num.positive(), ma99: num.positive() }),
  atr: z.object({ atr_pct: num.nonnegative() }),
  support_resistance: z
    .object({ supports: z.array(num).default([]), resistances: z.array(num).default([]) })
    .optional(),
});

export type TechSnapshot = {
  symbol: string;
  pair: string;
  price: number;
  rsi: number;
  averages: { days: 7 | 25 | 99; value: number; above: boolean }[];
  macdHistogram: number;
  /** Average daily range as a % of price. */
  dailyRangePct: number;
  support: number | null;
  resistance: number | null;
};

export type Technicals = {
  source: "bitget-signal";
  fetchedAt: string;
  timeframe: "1d";
  snapshots: TechSnapshot[];
  /** Symbols the Skill had no data for (e.g. no tokenized pair), or that failed validation. */
  missing: string[];
};

/** Validate one Skill response and keep only the measurements we trust. Null if unusable. */
export function parseTechnicals(symbol: string, raw: unknown): TechSnapshot | null {
  const parsed = Payload.safeParse(raw);
  if (!parsed.success) return null;
  const { rsi, macd, ma, atr, support_resistance } = parsed.data;
  const price = ma.price;
  const supports = (support_resistance?.supports ?? []).filter((v) => v < price);
  const resistances = (support_resistance?.resistances ?? []).filter((v) => v > price);
  return {
    symbol,
    pair: `${symbol}/USDT`,
    price,
    rsi: rsi.rsi,
    averages: ([7, 25, 99] as const).map((days) => {
      const value = ma[`ma${days}` as const];
      return { days, value, above: price > value };
    }),
    macdHistogram: macd.histogram,
    dailyRangePct: atr.atr_pct,
    support: supports.length ? Math.max(...supports) : null,
    resistance: resistances.length ? Math.min(...resistances) : null,
  };
}

export async function getTechnicals(symbols: string[], budgetMs = 8_000): Promise<Technicals> {
  const unique = [...new Set(symbols)];
  const one = async (symbol: string) => {
    // Breaker keyed per symbol: "no pair for KO" must not switch the Skill off for NVDA.
    const raw = await callSkill(
      "technical_analysis",
      { action: "full_analysis", symbol: `${symbol}/USDT`, timeframe: "1d" },
      `technical_analysis:${symbol}`,
    );
    return parseTechnicals(symbol, raw);
  };

  const timeout = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), budgetMs));
  const results = await Promise.all(
    unique.map((s) =>
      Promise.race([one(s).catch(() => null), timeout]).then((r) => (r === "timeout" ? null : r)),
    ),
  );

  return {
    source: "bitget-signal",
    fetchedAt: new Date().toISOString(),
    timeframe: "1d",
    snapshots: results.filter((r): r is TechSnapshot => r !== null),
    missing: unique.filter((_, i) => results[i] === null),
  };
}
