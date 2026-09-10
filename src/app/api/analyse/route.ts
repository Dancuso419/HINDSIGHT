import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { TradeSchema, buildPositions } from "@/lib/trades";
import { computeFacts } from "@/lib/analysis";
import { ReportSchema, enforceCitations } from "@/lib/report";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const RequestSchema = z.object({
  trades: z.array(TradeSchema).min(4).max(2000),
  question: z.string().max(300).optional(),
});

const SYSTEM = `You are a trading coach reviewing one retail trader's own closed positions.

You are given FACTS: figures already computed from their fills. Treat them as the only
numbers that exist. Never compute, estimate, round differently, or invent a figure, and
never describe a pattern the FACTS do not show.

Every pattern you report must cite the position ids (P01) or trade ids (T0001) it rests
on, taken verbatim from the FACTS. A claim you cannot cite must be left out.

Report at most three patterns — the ones that cost this trader the most money. Write about
their decisions, not about the market: they control entries, size, adds and exits, not
price. Second person, plain language, no hedging, no encouragement, no disclaimers.

The checklist is 3-6 rules this specific trader could have applied to the cited positions.
Each rule must be checkable before or during a trade, and must be specific enough that
someone reading it alone could tell which mistake it prevents.`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set on the server." }, { status: 500 });
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

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `The trader asks: "${question}"

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
)}`,
        },
      ],
      output_config: { format: zodOutputFormat(ReportSchema) },
    });

    if (!response.parsed_output) {
      return NextResponse.json({ error: "The model did not return a valid report." }, { status: 502 });
    }

    const validIds = new Set([
      ...positions.map((p) => p.id),
      ...parsed.data.trades.map((t) => t.id),
    ]);
    const { report, dropped } = enforceCitations(response.parsed_output, validIds);

    if (report.patterns.length === 0) {
      return NextResponse.json(
        { error: "Every pattern the model produced cited trades that do not exist. Nothing to show.", dropped },
        { status: 502 },
      );
    }

    return NextResponse.json({ report, facts, positions, dropped });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "The server's Anthropic API key was rejected." }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited by the model API. Try again in a moment." }, { status: 429 });
    }
    const message = error instanceof Anthropic.APIError ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
