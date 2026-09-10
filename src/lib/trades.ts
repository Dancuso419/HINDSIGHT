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

const SIDES: Record<string, "buy" | "sell"> = {
  buy: "buy",
  b: "buy",
  long: "buy",
  open: "buy",
  sell: "sell",
  s: "sell",
  short: "sell",
  close: "sell",
};

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
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
    const candidate = {
      id: String(row.id ?? "").trim() || `t${i + 1}`,
      timestamp: Number.isNaN(ts) ? String(row.timestamp ?? "") : new Date(ts).toISOString(),
      symbol: String(row.symbol ?? "").trim().toUpperCase(),
      side: SIDES[String(row.side ?? "").trim().toLowerCase()] ?? row.side,
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
