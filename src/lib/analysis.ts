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

export function computeFacts(positions: Position[]) {
  const closed = positions.filter((p) => p.pnl !== null);
  const wins = closed.filter((p) => p.pnl! > 0);
  const losses = closed.filter((p) => p.pnl! <= 0);

  const averagedDown = closed.filter((p) => p.addsDown > 0);
  const medianNotional = median(closed.map(notional));

  // A position opened within 3h of closing a loss, at well above the usual size.
  const revenge = closed.filter((p) => {
    const opened = Date.parse(p.openedAt);
    const priorLoss = losses.find((l) => {
      const t = Date.parse(l.closedAt!);
      return t < opened && opened - t <= 3 * 3600_000;
    });
    return Boolean(priorLoss) && notional(p) >= 1.8 * medianNotional;
  });

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
    medianNotional: round(medianNotional),
    bySymbol: symbols,
    worstPositions: [...closed]
      .sort((a, b) => a.pnl! - b.pnl!)
      .slice(0, 5)
      .map((p) => ({ id: p.id, symbol: p.symbol, pnl: p.pnl, pnlPct: p.pnlPct, addsDown: p.addsDown, tradeIds: p.tradeIds })),
  };
}
