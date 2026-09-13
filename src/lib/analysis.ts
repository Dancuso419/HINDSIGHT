import type { Position } from "./trades";

/**
 * Every number the report is allowed to use is computed here, from the user's own data.
 * The model narrates these facts and picks which matter — it never produces a figure.
 * This is what keeps a claim in the report traceable to specific trades.
 */
export type Facts = ReturnType<typeof computeFacts>;

const round = (n: number, dp = 2) => Number(n.toFixed(dp));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const notional = (p: Position) => p.qty * p.avgEntry;

export const REENTRY_WINDOW_HOURS = 3;

/** Closed positions opened within the re-entry window after closing a losing one. */
export function reentriesAfterLoss(closed: Position[]): Position[] {
  const losses = closed.filter((p) => p.pnl! <= 0);
  return closed.filter((p) => {
    const opened = Date.parse(p.openedAt);
    return losses.some((l) => {
      const t = Date.parse(l.closedAt!);
      return l.id !== p.id && t < opened && opened - t <= REENTRY_WINDOW_HOURS * 3600_000;
    });
  });
}

export function computeFacts(positions: Position[]) {
  const closed = positions.filter((p) => p.pnl !== null);
  const wins = closed.filter((p) => p.pnl! > 0);
  const losses = closed.filter((p) => p.pnl! <= 0);

  const averagedDown = closed.filter((p) => p.addsDown > 0);
  const medianNotional = median(closed.map(notional));

  // Revenge: a quick re-entry after a loss, at well above the usual size.
  const revenge = reentriesAfterLoss(closed).filter((p) => notional(p) >= 1.8 * medianNotional);

  const symbols = [...new Set(closed.map((p) => p.symbol))].map((symbol) => {
    const ps = closed.filter((p) => p.symbol === symbol);
    return {
      symbol,
      positions: ps.length,
      wins: ps.filter((p) => p.pnl! > 0).length,
      pnl: round(ps.reduce((s, p) => s + p.pnl!, 0)),
      positionIds: ps.map((p) => p.id),
    };
  }).sort((a, b) => a.pnl - b.pnl);

  const group = (ps: Position[]) => ({
    count: ps.length,
    avgPnlPct: round(mean(ps.map((p) => p.pnlPct!))),
    avgHoldHours: round(mean(ps.map((p) => p.holdHours ?? 0)), 1),
    totalPnl: round(ps.reduce((s, p) => s + p.pnl!, 0)),
    positionIds: ps.map((p) => p.id),
  });

  return {
    positions: closed.length,
    open: positions.length - closed.length,
    winRate: closed.length ? round((wins.length / closed.length) * 100, 1) : 0,
    netPnl: round(closed.reduce((s, p) => s + p.pnl!, 0)),
    totalFees: round(positions.reduce((s, p) => s + p.fees, 0)),
    wins: group(wins),
    losses: group(losses),
    averagedDown: {
      ...group(averagedDown),
      losingShare: averagedDown.length
        ? round((averagedDown.filter((p) => p.pnl! <= 0).length / averagedDown.length) * 100, 1)
        : 0,
    },
    revengeTrades: group(revenge),
    // Computed here so the model never has to subtract timestamps itself.
    reentriesAfterLoss: reentriesAfterLoss(closed).map((p) => {
      const opened = Date.parse(p.openedAt);
      const prior = losses
        .filter((l) => Date.parse(l.closedAt!) < opened)
        .sort((a, b) => Date.parse(b.closedAt!) - Date.parse(a.closedAt!))[0];
      return {
        id: p.id,
        afterLoss: prior.id,
        minutesAfterLoss: Math.round((opened - Date.parse(prior.closedAt!)) / 60_000),
        sizeVsMedian: round(notional(p) / medianNotional, 2),
        pnl: p.pnl,
      };
    }),
    medianNotional: round(medianNotional),
    bySymbol: symbols,
    worstPositions: [...closed]
      .sort((a, b) => a.pnl! - b.pnl!)
      .slice(0, 5)
      .map((p) => ({ id: p.id, symbol: p.symbol, pnl: p.pnl, pnlPct: p.pnlPct, addsDown: p.addsDown, tradeIds: p.tradeIds })),
  };
}
