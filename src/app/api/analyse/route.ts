import { NextResponse } from "next/server";
import { z } from "zod";
import { TradeSchema, buildPositions } from "@/lib/trades";
import { computeFacts } from "@/lib/analysis";
import { ReportSchema, enforceCitations } from "@/lib/report";
import { replayNoAveragingDown, replayNoReentryAfterLoss, replayStopLoss, unavailableStopLoss } from "@/lib/replay";
import { getSentiment, entrySentiment, getCandles } from "@/lib/market";
import { getTechnicals } from "@/lib/technicals";
import { ATTEMPTS, buildInput, callModel } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

const RequestSchema = z.object({
  trades: z.array(TradeSchema).min(4).max(2000),
  question: z.string().max(300).optional(),
});

/** Vercel stops the function at maxDuration; every model attempt must finish before this. */
const DEADLINE_MS = (maxDuration - 8) * 1000;

export async function POST(req: Request) {
  const startedAt = Date.now();
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

  // Market data is best-effort and time-boxed: the analysis never waits on a failing Skill.
  const closedDates = positions.filter((p) => p.pnl !== null).map((p) => Date.parse(p.openedAt));
  const daysBack = Math.ceil((Date.now() - Math.min(...closedDates)) / 86_400_000) + 2;
  // Technicals are display-only context for the symbols traded — they never enter the prompt.
  const [sentiment, prices, technicals] = await Promise.all([
    getSentiment(daysBack),
    getCandles(positions),
    getTechnicals(positions.filter((p) => p.pnl !== null).map((p) => p.symbol)),
  ]);

  const replays = [
    replayNoAveragingDown(positions, parsed.data.trades),
    replayNoReentryAfterLoss(positions),
    prices.candles.size
      ? replayStopLoss(positions, prices.candles, prices.sources.join(" + "))
      : unavailableStopLoss(
          "No price source answered — bitget-signal, Yahoo Finance and the saved prices all came back empty for these symbols.",
        ),
  ];
  const market = entrySentiment(positions, sentiment.byDay, sentiment.source);

  const question = parsed.data.question?.trim() || "What do I keep getting wrong?";
  const input = buildInput({ question, facts, replays, market, positions });

  let raw = "";
  let rateLimited = false;

  for (const { model, thinkingLevel, capMs } of ATTEMPTS) {
    const left = DEADLINE_MS - (Date.now() - startedAt);
    if (left < 5_000) break;
    try {
      const r = await callModel({ apiKey, model, input, thinkingLevel, timeoutMs: Math.min(capMs, left) });
      if (r.ok) {
        raw = r.text;
        break;
      }
      rateLimited ||= r.status === 429;
      console.error("gemini error", model, r.status, r.detail);
      if (r.status < 429) break; // a 400 will fail the same way on every retry
    } catch (e) {
      // timeout or network failure — the next model gets a turn
      console.error("gemini attempt failed", model, (e as Error).name);
    }
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

  return NextResponse.json({ report: checked, facts, positions, dropped, replays, market, technicals });
}
