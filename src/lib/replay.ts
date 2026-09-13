import type { Position, Trade } from "./trades";
import { REENTRY_WINDOW_HOURS, reentriesAfterLoss } from "./analysis";

/**
 * Replay the trader's own history with one rule applied, and report what it would have
 * changed in dollars. Everything here is arithmetic on their fills — same exits, same
 * timing, only the rule-breaking decision removed. A rule that would have cost money is
 * reported as costing money.
 */

export type RuleId = "no-averaging-down" | "no-reentry-after-loss" | "stop-loss";

export type RuleReplay = {
  id: RuleId;
  rule: string;
  status: "computed" | "unavailable";
  /** Why a rule could not be replayed — shown to the user as-is. */
  reason?: string;
  /** Where external data came from, for rules that need it. */
  source?: string;
  affected: { id: string; actual: number; replayed: number }[];
  actualPnl: number;
  replayedPnl: number;
  /** replayed − actual. Positive = the rule would have saved money. */
  delta: number;
};

const round = (n: number) => Number(n.toFixed(2));

export function summarise(rule: Omit<RuleReplay, "actualPnl" | "replayedPnl" | "delta">): RuleReplay {
  const actualPnl = round(rule.affected.reduce((s, a) => s + a.actual, 0));
  const replayedPnl = round(rule.affected.reduce((s, a) => s + a.replayed, 0));
  return { ...rule, actualPnl, replayedPnl, delta: round(replayedPnl - actualPnl) };
}

/**
 * Never add to a position below its first entry. Adds below the opening price are removed;
 * the position still exits at the same average price, sized to what was actually held.
 */
export function replayNoAveragingDown(positions: Position[], trades: Trade[]): RuleReplay {
  const byId = new Map(trades.map((t) => [t.id, t]));
  const affected: RuleReplay["affected"] = [];

  for (const p of positions) {
    if (p.pnl === null || p.exitPrice === null) continue;
    const fills = p.tradeIds.map((id) => byId.get(id)!).filter(Boolean);
    const buys = fills.filter((f) => f.side === "buy");
    const sells = fills.filter((f) => f.side === "sell");
    if (buys.length < 2) continue;

    const first = buys[0];
    const kept = buys.filter((b, i) => i === 0 || b.price >= first.price);
    if (kept.length === buys.length) continue; // no adds below entry — rule not broken

    const boughtQty = buys.reduce((s, b) => s + b.qty, 0);
    const keptQty = kept.reduce((s, b) => s + b.qty, 0);
    const keptCost = kept.reduce((s, b) => s + b.qty * b.price, 0);
    const keptBuyFees = kept.reduce((s, b) => s + b.fee, 0);
    const sellFees = sells.reduce((s, f) => s + f.fee, 0) * (keptQty / boughtQty);

    const replayed = keptQty * p.exitPrice - keptCost - keptBuyFees - sellFees;
    affected.push({ id: p.id, actual: p.pnl, replayed: round(replayed) });
  }

  return summarise({
    id: "no-averaging-down",
    rule: "Never add to a position trading below your first entry",
    status: "computed",
    affected,
  });
}

/** No new position within the re-entry window after closing a loss — those trades are skipped. */
export function replayNoReentryAfterLoss(positions: Position[]): RuleReplay {
  const closed = positions.filter((p) => p.pnl !== null);
  const affected = reentriesAfterLoss(closed).map((p) => ({ id: p.id, actual: p.pnl!, replayed: 0 }));
  return summarise({
    id: "no-reentry-after-loss",
    rule: `Wait ${REENTRY_WINDOW_HOURS} hours after closing a loss before opening anything new`,
    status: "computed",
    affected,
  });
}

/** Daily candle: timestamp (ms, start of day UTC) and the day's range. */
export type Candle = { t: number; open: number; high: number; low: number; close: number };

export const STOP_LOSS_PCT = 5;

/**
 * Exit at −STOP_LOSS_PCT% from average entry, using the market's daily lows between entry and
 * the actual exit. Daily candles cannot say whether the stop or the exit came first within the
 * exit day, so the exit day itself is not tested — the replay can only understate the rule.
 */
export function replayStopLoss(
  positions: Position[],
  candlesBySymbol: Map<string, Candle[]>,
  source: string,
): RuleReplay {
  const affected: RuleReplay["affected"] = [];
  const skipped: string[] = [];

  for (const p of positions) {
    if (p.pnl === null || p.closedAt === null || p.exitPrice === null) continue;
    const candles = candlesBySymbol.get(p.symbol);
    if (!candles?.length) continue;

    // Guard: the file's prices must match the market's, or the replay would be fiction.
    const dayOf = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
    const entryDay = candles.find((c) => c.t === dayOf(p.openedAt));
    if (!entryDay || p.avgEntry < entryDay.low * 0.9 || p.avgEntry > entryDay.high * 1.1) {
      skipped.push(p.id);
      continue;
    }

    const stop = p.avgEntry * (1 - STOP_LOSS_PCT / 100);
    const hit = candles.find((c) => c.t > dayOf(p.openedAt) && c.t < dayOf(p.closedAt!) && c.low <= stop);
    if (!hit) continue; // the stop would never have triggered — outcome unchanged

    const cost = p.qty * p.avgEntry;
    const replayed = p.qty * stop - cost - p.fees;
    affected.push({ id: p.id, actual: p.pnl, replayed: round(replayed) });
  }

  const noMatch = affected.length === 0 && skipped.length > 0;
  return summarise({
    id: "stop-loss",
    rule: `Exit any position that falls ${STOP_LOSS_PCT}% below your entry`,
    status: noMatch ? "unavailable" : "computed",
    reason: noMatch
      ? "The prices in this file do not match market prices on those dates, so the stop cannot be replayed honestly."
      : undefined,
    source,
    affected,
  });
}

export function unavailableStopLoss(reason: string): RuleReplay {
  return summarise({
    id: "stop-loss",
    rule: `Exit any position that falls ${STOP_LOSS_PCT}% below your entry`,
    status: "unavailable",
    reason,
    affected: [],
  });
}
