import { NextResponse } from "next/server";
import { z } from "zod";
import { TradeSchema, buildPositions } from "@/lib/trades";
import { computeFacts } from "@/lib/analysis";
import { ReportSchema, enforceCitations } from "@/lib/report";

export const runtime = "nodejs";
export const maxDuration = 120;

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
/**
 * The free tier throws intermittent "high demand" 500s, and its request quota is a
 * per-minute bucket held separately per model — measured: 3.8-flash 20/min,
 * 3.7/3.5-flash 20/min, 3.1-flash-lite >60/min, 2.5-flash only 5/min (older is not
 * more generous).
 * So every attempt uses a different model: best quality first, most headroom last.
 */
const MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];

const RequestSchema = z.object({
  trades: z.array(TradeSchema).min(4).max(2000),
  question: z.string().max(300).optional(),
});

const SYSTEM = `You are a trading coach reviewing one retail trader's own closed positions.

You are given FACTS: figures already computed from their fills. Treat them as the only
numbers that exist. Never compute, estimate, round differently, or invent a figure, and
never describe a pattern the FACTS do not show.

Every pattern you report must cite the position ids (P01) or trade ids (T0001) it rests
on, taken verbatim from the data. A claim you cannot cite must be left out.

Report at most three patterns — the ones that cost this trader the most money. Write about
their decisions, not about the market: they control entries, size, adds and exits, not
price. Second person, plain language, no hedging, no encouragement, no disclaimers.

The checklist is 3-6 rules this specific trader could have applied to the cited positions.
Each rule must be checkable before or during a trade, and must be specific enough that
someone reading it alone could tell which mistake it prevents.`;

// Gemini takes plain JSON Schema; Zod generates it, and Zod validates what comes back.
const REPORT_JSON_SCHEMA = (() => {
  const schema = z.toJSONSchema(ReportSchema, { io: "output", reused: "inline" }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
})();

/** The generated text lives in steps[].content[].text on a model_output step. */
function extractText(body: unknown): string {
  const b = body as {
    output_text?: string;
    steps?: { type?: string; content?: { type?: string; text?: string }[] }[];
  };
  if (typeof b?.output_text === "string") return b.output_text;
  return (b?.steps ?? [])
    .filter((s) => s.type === "model_output")
    .flatMap((s) => s.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text!)
    .join("");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server." }, { status: 500 });
  }

  const positions = buildPositions(parsed.data.trades);
  const facts = computeFacts(positions);
  if (facts.positions < 3) {
    return NextResponse.json(
      { error: "Not enough closed positions to review — upload a history with at least 3 round trips." },
      { status: 422 },
    );
  }

  const question = parsed.data.question?.trim() || "What do I keep getting wrong?";
  const input = `The trader asks: "${question}"

FACTS (computed from their fills — the only numbers you may use):
${JSON.stringify(facts, null, 2)}

POSITIONS (each id maps to the trade ids that make it up):
${JSON.stringify(
  positions.map((p) => ({
    id: p.id, symbol: p.symbol, opened: p.openedAt, closed: p.closedAt,
    avgEntry: p.avgEntry, exit: p.exitPrice, pnl: p.pnl, pnlPct: p.pnlPct,
    addsDown: p.addsDown, holdHours: p.holdHours, tradeIds: p.tradeIds,
  })),
  null,
  2,
)}`;

  let raw = "";
  let rateLimited = false;

  for (const [attempt, model] of MODELS.entries()) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          system_instruction: SYSTEM,
          input,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: REPORT_JSON_SCHEMA,
          },
        }),
      });

      if (res.ok) {
        raw = extractText(await res.json());
        break;
      }

      rateLimited ||= res.status === 429;
      console.error("gemini error", model, res.status, (await res.text()).slice(0, 300));
      if (res.status < 429) break; // a 400 will fail the same way on every retry
    } catch {
      // network failure — fall through to the next attempt
    }
    if (attempt < MODELS.length - 1) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }

  if (!raw) {
    return NextResponse.json(
      {
        error: rateLimited
          ? "The Gemini free tier's quota is used up for the minute. Wait about a minute and try again."
          : "The model API is unavailable right now. Try again in a moment.",
      },
      { status: rateLimited ? 429 : 502 },
    );
  }

  // Malformed output fails loudly rather than rendering garbage.
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "The model did not return valid JSON." }, { status: 502 });
  }

  const report = ReportSchema.safeParse(candidate);
  if (!report.success) {
    return NextResponse.json(
      { error: "The model's report did not match the required shape.", issues: report.error.issues },
      { status: 502 },
    );
  }

  const validIds = new Set([...positions.map((p) => p.id), ...parsed.data.trades.map((t) => t.id)]);
  const { report: checked, dropped } = enforceCitations(report.data, validIds);

  if (checked.patterns.length === 0) {
    return NextResponse.json(
      { error: "Every pattern the model produced cited trades that do not exist. Nothing to show.", dropped },
      { status: 502 },
    );
  }

  return NextResponse.json({ report: checked, facts, positions, dropped });
}
