import Papa from "papaparse";
import { z } from "zod";

export const TradeSchema = z.object({
  id: z.string().min(1),
  timestamp: z.iso.datetime({ offset: true, local: true }),
  symbol: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  qty: z.number().positive(),
  price: z.number().positive(),
  fee: z.number().min(0),
});

export type Trade = z.infer<typeof TradeSchema>;

export type ParseResult = {
  trades: Trade[];
  errors: { row: number; message: string }[];
};

// ponytail: fixed alias table, not a mapping UI. Add a column-mapper only if a real
// export shows up that this cannot read.
const ALIASES: Record<string, keyof Trade> = {
  id: "id",
  tradeid: "id",
  orderid: "id",
  timestamp: "timestamp",
  time: "timestamp",
  date: "timestamp",
  datetime: "timestamp",
  symbol: "symbol",
  pair: "symbol",
  instrument: "symbol",
  market: "symbol",
  side: "side",
  direction: "side",
  type: "side",
  qty: "qty",
  quantity: "qty",
  size: "qty",
  amount: "qty",
  filledqty: "qty",
  price: "price",
  fillprice: "price",
  avgprice: "price",
  executedprice: "price",
  fee: "fee",
  fees: "fee",
  commission: "fee",
};

const normaliseHeader = (h: string) => ALIASES[h.toLowerCase().replace(/[\s_-]/g, "")] ?? h;

const SIDES: Record<string, "buy" | "sell"> = { buy: "buy", b: "buy", bid: "buy", sell: "sell", s: "sell", ask: "sell" };

/**
 * Exchanges word a fill many ways: "Buy", "B", "Open long", "Close long". Hindsight models long
 * positions only, so anything involving a short is refused with a reason rather than guessed.
 */
function normaliseSide(raw: unknown): "buy" | "sell" | { unsupported: string } | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (/short/.test(v)) return { unsupported: `short positions are not supported ("${String(raw).trim()}")` };
  if (SIDES[v]) return SIDES[v];
  if (/\bclose\b/.test(v) || /\bsell\b/.test(v)) return "sell";
  if (/\bopen\b/.test(v) || /\bbuy\b/.test(v) || /\blong\b/.test(v)) return "buy";
  return null;
}

/** "218.29 USDT", "$1,234.50", "0.33 USDT" → the number. Anything without a number → NaN. */
const num = (v: unknown) => {
  const m = String(v ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/i);
  const n = m ? Number(m[0]) : NaN;
  return Number.isFinite(n) ? n : NaN;
};

/** "NVDA/USDT", "NVDA-USDT", "NVDAUSDT" → "NVDA". A bare quote currency is left alone. */
const normaliseSymbol = (raw: unknown) => {
  const v = String(raw ?? "").trim().toUpperCase();
  const m = v.match(/^(.+?)[\/\-_ ]?(USDT|USDC|USD)$/);
  return m && m[1] ? m[1] : v;
};

/** Parse a raw CSV export into normalised trades. Bad rows are reported, never dropped silently. */
export function parseTrades(csv: string): ParseResult {
  const { data } = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: normaliseHeader,
  });

  const trades: Trade[] = [];
  const errors: ParseResult["errors"] = [];

  data.forEach((row, i) => {
    const rowNo = i + 2; // +1 for header, +1 for 1-indexing
    const ts = Date.parse(String(row.timestamp ?? ""));
    const side = normaliseSide(row.side);
    if (side && typeof side === "object") {
      errors.push({ row: rowNo, message: `side: ${side.unsupported}` });
      return;
    }
    const candidate = {
      id: String(row.id ?? "").trim() || `t${i + 1}`,
      timestamp: Number.isNaN(ts) ? String(row.timestamp ?? "") : new Date(ts).toISOString(),
      symbol: normaliseSymbol(row.symbol),
      side: typeof side === "string" ? side : row.side,
      qty: num(row.qty),
      price: num(row.price),
      fee: row.fee === undefined || row.fee === "" ? 0 : num(row.fee),
    };

    const parsed = TradeSchema.safeParse(candidate);
    if (parsed.success) trades.push(parsed.data);
    else
      errors.push({
        row: rowNo,
        message: parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
      });
  });

  trades.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return { trades, errors };
}

export function summarise(trades: Trade[]) {
  const symbols = [...new Set(trades.map((t) => t.symbol))].sort();
  return {
    count: trades.length,
    symbols,
    from: trades[0]?.timestamp ?? null,
    to: trades.at(-1)?.timestamp ?? null,
    volume: trades.reduce((s, t) => s + t.qty * t.price, 0),
    fees: trades.reduce((s, t) => s + t.fee, 0),
  };
}

export type Position = {
  id: string;
  symbol: string;
  tradeIds: string[];
  openedAt: string;
  closedAt: string | null;
  qty: number;
  avgEntry: number;
  exitPrice: number | null;
  /** Realised PnL in quote currency, fees included. Null while the position is still open. */
  pnl: number | null;
  pnlPct: number | null;
  /** Entries added after the first one at a worse price — averaging down. */
  addsDown: number;
  holdHours: number | null;
  fees: number;
};

/**
 * Group fills into round-trip positions, one per symbol at a time: buys accumulate,
 * sells reduce, and the position closes when the symbol goes flat.
 * ponytail: long-only net position per symbol. Shorts and simultaneous opposite
 * positions are not modelled — the target user is spot-long retail.
 */
export function buildPositions(trades: Trade[]): Position[] {
  const open = new Map<string, { fills: Trade[]; qty: number; cost: number; proceeds: number; soldQty: number; fees: number }>();
  const closed: Position[] = [];

  for (const t of trades) {
    let p = open.get(t.symbol);
    if (!p) {
      if (t.side === "sell") continue; // a sell with nothing open — nothing to attribute it to
      p = { fills: [], qty: 0, cost: 0, proceeds: 0, soldQty: 0, fees: 0 };
      open.set(t.symbol, p);
    }
    p.fills.push(t);
    p.fees += t.fee;

    if (t.side === "buy") {
      p.qty += t.qty;
      p.cost += t.qty * t.price;
    } else {
      p.qty -= t.qty;
      p.soldQty += t.qty;
      p.proceeds += t.qty * t.price;
    }

    if (isFlat(p.qty, p.soldQty + Math.max(p.qty, 0))) {
      closed.push(finish(p, closed.length + 1));
      open.set(t.symbol, undefined!);
      open.delete(t.symbol);
    }
  }

  for (const p of open.values()) if (p) closed.push(finish(p, closed.length + 1));

  return closed.sort((a, b) => a.openedAt.localeCompare(b.openedAt));
}

function finish(
  p: { fills: Trade[]; cost: number; proceeds: number; soldQty: number; fees: number },
  n: number,
): Position {
  const buys = p.fills.filter((f) => f.side === "buy");
  const sells = p.fills.filter((f) => f.side === "sell");
  const boughtQty = buys.reduce((s, f) => s + f.qty, 0);
  const avgEntry = p.cost / boughtQty;
  const first = buys[0];
  const last = p.fills.at(-1)!;
  const isClosed = sells.length > 0 && isFlat(boughtQty - p.soldQty, boughtQty);
  const exitPrice = sells.length ? p.proceeds / p.soldQty : null;
  const pnl = isClosed ? p.proceeds - p.cost - p.fees : null;

  return {
    id: `P${String(n).padStart(2, "0")}`,
    symbol: first.symbol,
    tradeIds: p.fills.map((f) => f.id),
    openedAt: first.timestamp,
    closedAt: isClosed ? last.timestamp : null,
    qty: round(boughtQty, 6),
    avgEntry: round(avgEntry, 4),
    exitPrice: exitPrice === null ? null : round(exitPrice, 4),
    pnl: pnl === null ? null : round(pnl, 2),
    pnlPct: pnl === null ? null : round((pnl / p.cost) * 100, 2),
    addsDown: buys.filter((f, i) => i > 0 && f.price < buys[i - 1].price).length,
    holdHours: isClosed
      ? round((Date.parse(last.timestamp) - Date.parse(first.timestamp)) / 3600_000, 1)
      : null,
    fees: round(p.fees, 2),
  };
}

const round = (n: number, dp: number) => Number(n.toFixed(dp));

/**
 * A position counts as flat when what is left is dust: exchanges round each fill's quantity,
 * so buys of 6.3167 + 7.3284 closed by a sell of 13.645 leave 0.0001 behind. Treating that as
 * still open would silently merge every later trade in the symbol into one position.
 * ponytail: 0.1% of the size bought; dust above that is treated as a real remaining position.
 */
function isFlat(remaining: number, bought: number) {
  return remaining <= Math.max(1e-8, bought * 1e-3);
}
