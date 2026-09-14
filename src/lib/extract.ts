import { z } from "zod";
import { callGemini, toGeminiSchema, type GeminiInput, type ThinkingLevel } from "./gemini";

/**
 * Reading trades out of order-history screenshots. The model transcribes; it never completes.
 * Anything not visible stays empty and is flagged, and every row is shown to the trader for
 * correction before a single number reaches the analysis.
 */

export const ExtractedRowSchema = z.object({
  date: z.string().describe("The date exactly as printed, e.g. '2025-10-03' or '10-27'. Never add a year that is not shown."),
  time: z.string().optional().describe("The time exactly as printed, e.g. '18:08:52' or '16:28'. Omit if none is shown."),
  symbol: z.string().describe("The instrument as printed, e.g. 'NVDA/USDT'."),
  side: z.enum(["buy", "sell", "unknown"]).describe("buy or sell as printed; unknown if it cannot be read."),
  // Optional rather than nullable: Gemini's schema support rejects ["number","null"] types.
  qty: z.number().optional().describe("The filled quantity as printed. Omit if not readable."),
  price: z.number().optional().describe("The fill or average price as printed, without currency. Omit if not readable."),
  fee: z.number().optional().describe("The fee as printed, without currency. Omit if no fee is shown."),
  status: z.string().optional().describe("Order status as printed, e.g. 'Filled', 'Cancelled'. Omit if none is shown."),
  issues: z
    .array(z.string())
    .describe("Anything uncertain about this row: an unreadable digit, a cut-off value, a missing year. Empty if none."),
});

export const ExtractionSchema = z.object({
  // No max here: Gemini rejects a large maxItems (300 → 400 invalid argument). Row count is
  // bounded by the request instead — at most 4 screenshots.
  rows: z.array(ExtractedRowSchema),
  notes: z.array(z.string()).describe("Anything about the screenshots as a whole, e.g. 'the list continues below the cut-off'."),
});

export type ExtractedRow = z.infer<typeof ExtractedRowSchema>;
export type Extraction = z.infer<typeof ExtractionSchema>;

const SYSTEM = `You transcribe trade executions from screenshots of an exchange or brokerage order history.

Transcribe only what is visible. Do not infer, complete or correct anything: if a year, a time,
a fee or a digit is not visible, omit that field or copy it exactly as printed, and say so in the
row's issues. A wrong number here would corrupt a financial review, so an honest gap is always
better than a plausible guess.

One row per execution, in the order shown. Include every order row you can see, whatever its
status, and copy the status as printed. Numbers are written without currency units or thousands
separators. Ignore headers, totals, balances and anything that is not an individual order.`;

const EXTRACTION_JSON_SCHEMA = toGeminiSchema(ExtractionSchema);

export const EXTRACT_ATTEMPTS: { model: string; thinkingLevel: ThinkingLevel; capMs: number }[] = [
  { model: "gemini-3.5-flash", thinkingLevel: "low", capMs: 30_000 },
  { model: "gemini-3.1-flash-lite", thinkingLevel: "low", capMs: 20_000 },
];

export async function extractTrades(opts: {
  apiKey: string;
  images: { data: string; mime_type: string }[];
  deadlineMs: number;
  attempts?: typeof EXTRACT_ATTEMPTS;
}): Promise<{ ok: true; extraction: Extraction; model: string } | { ok: false; error: string; status: number }> {
  const started = Date.now();
  const input: GeminiInput = [
    {
      type: "text",
      text: `Transcribe every order execution visible in ${opts.images.length === 1 ? "this screenshot" : `these ${opts.images.length} screenshots`}.`,
    },
    ...opts.images.map((img) => ({ type: "image" as const, ...img })),
  ];

  let rateLimited = false;
  for (const { model, thinkingLevel, capMs } of opts.attempts ?? EXTRACT_ATTEMPTS) {
    const left = opts.deadlineMs - (Date.now() - started);
    if (left < 4_000) break;
    try {
      const r = await callGemini({
        apiKey: opts.apiKey,
        model,
        system: SYSTEM,
        input,
        schema: EXTRACTION_JSON_SCHEMA,
        thinkingLevel,
        timeoutMs: Math.min(capMs, left),
      });
      if (!r.ok) {
        rateLimited ||= r.status === 429;
        console.error("extract error", model, r.status, r.detail);
        if (r.status === 400 || r.status === 401 || r.status === 403) break;
        continue;
      }
      const parsed = ExtractionSchema.safeParse(JSON.parse(r.text));
      if (!parsed.success) {
        console.error("extract rejected", model, JSON.stringify(parsed.error.issues).slice(0, 300));
        continue;
      }
      return { ok: true, extraction: parsed.data, model };
    } catch (e) {
      const err = e as Error & { cause?: { code?: string; message?: string } };
      console.error("extract attempt failed", model, err.name, err.message, err.cause?.code ?? err.cause?.message ?? "");
    }
  }
  return rateLimited
    ? { ok: false, status: 429, error: "The Gemini free tier's quota is used up for the minute. Wait about a minute and try again." }
    : { ok: false, status: 502, error: "The screenshots could not be read right now. Try again, or paste the trades instead." };
}

/* ------------------------------------------------------------------ review → trades */

export type ReviewRow = {
  include: boolean;
  date: string;
  time: string;
  symbol: string;
  side: "buy" | "sell" | "unknown";
  qty: string;
  price: string;
  fee: string;
  status: string;
  issues: string[];
};

const FILLED = /fill|done|complet|execut|deal|success|成交/i;

/** The editable form of an extracted row. Rows that clearly did not execute start excluded. */
export function toReviewRow(r: ExtractedRow): ReviewRow {
  const executed = r.status === undefined || FILLED.test(r.status);
  const issues = [...r.issues];
  if (!/\b(19|20)\d{2}\b/.test(r.date) && !issues.some((i) => /year/i.test(i))) issues.push("year not shown");
  return {
    include: executed,
    date: r.date,
    time: r.time ?? "",
    symbol: r.symbol,
    side: r.side,
    qty: r.qty === undefined ? "" : String(r.qty),
    price: r.price === undefined ? "" : String(r.price),
    fee: r.fee === undefined ? "" : String(r.fee),
    status: r.status ?? "",
    issues,
  };
}

/**
 * Build a timestamp from the date as printed plus the year the trader supplied for rows that
 * show none. Returns null when the date still has no year — the analysis never gets a guess.
 */
export function rowTimestamp(row: Pick<ReviewRow, "date" | "time">, year: string): string | null {
  const d = row.date.trim();
  const t = row.time.trim() || "00:00";
  const full = d.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const monthDay = d.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  let y: string, m: string, day: string;
  if (full) [, y, m, day] = full;
  else if (monthDay && /^\d{4}$/.test(year)) [y, m, day] = [year, monthDay[1], monthDay[2]];
  else return null;
  const iso = `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}T${t.length === 5 ? `${t}:00` : t}Z`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/** Confirmed review rows → CSV for the existing parser, so screenshots and files share one path. */
export function reviewToCsv(rows: ReviewRow[], year: string): { csv: string; unresolved: number } {
  let unresolved = 0;
  const lines = ["timestamp,symbol,side,qty,price,fee"];
  for (const r of rows) {
    if (!r.include) continue;
    const ts = rowTimestamp(r, year);
    if (!ts) {
      unresolved++;
      continue;
    }
    const cells = [ts, r.symbol, r.side === "unknown" ? "" : r.side, r.qty, r.price, r.fee];
    lines.push(cells.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","));
  }
  return { csv: lines.join("\n"), unresolved };
}
