import { z } from "zod";
import { ReportSchema } from "./report";
import type { Facts } from "./analysis";
import type { RuleReplay } from "./replay";
import type { EntrySentiment } from "./market";
import type { Position } from "./trades";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

/**
 * Attempt order, each on a different model because the free tier's quota is a per-minute
 * bucket held separately per model, and each capped because a model can hang rather than fail.
 * Measured on the real sample prompt, 2026-09-14:
 *   3.8-flash      hung past 110s at every thinking level (was 25s earlier the same day)
 *   3.7-flash      "high demand" 500 after 22s
 *   3.5-flash      minimal thinking: 7-8s, schema-valid, quality on par with 3.8's reports
 *   3.1-flash-lite minimal thinking: 6-10s, schema-valid, weaker (misattributed a percentage)
 * So: the fast good model first, the fast reliable one second, the slow best one last with
 * whatever time is left.
 */
export const ATTEMPTS: { model: string; thinkingLevel: ThinkingLevel; capMs: number }[] = [
  { model: "gemini-3.5-flash", thinkingLevel: "minimal", capMs: 30_000 },
  { model: "gemini-3.1-flash-lite", thinkingLevel: "minimal", capMs: 25_000 },
  { model: "gemini-3.8-flash", thinkingLevel: "low", capMs: 40_000 },
];

export const SYSTEM = `You are a trading coach reviewing one retail trader's own closed positions.

You are given FACTS: figures already computed from their fills. Treat them as the only
numbers that exist. Never compute, estimate, round differently, or invent a figure, and
never describe a pattern the FACTS do not show.

Every pattern you report must cite the position ids (P01) or trade ids (T0001) it rests
on, taken verbatim from the data. A claim you cannot cite must be left out.

Report at most three patterns: the ones that cost this trader the most money. Write about
their decisions, not about the market: they control entries, size, adds and exits, not
price. Second person, plain language, no hedging, no encouragement, no disclaimers. Do not use
em dashes; use commas, colons or full stops instead.

The checklist is 3-6 rules this specific trader could have applied to the cited positions.
Each rule must be checkable before or during a trade, and must be specific enough that
someone reading it alone could tell which mistake it prevents. Any number in a rule (a
threshold, a size, a waiting time) must come from FACTS or REPLAY. Never set one yourself.

A group's total P&L is not what a habit cost. The positions a trader averaged down may
have lost $1,000 in total while adding to them cost only $300, because the first entry would
have lost the rest anyway. When you say what a habit cost, use the REPLAY delta for that
rule, and say "would have saved" only with a REPLAY figure. If a replay delta is negative,
the rule would have cost money on this history; say so rather than recommending it, and do
not recommend a narrower version of it either (a stop-loss "only on these symbols" is still
a stop-loss the REPLAY says lost money). For a
habit with no REPLAY figure, state what those positions lost ("these 7 positions lost
$1,704.75") and never call that amount what the habit cost.

MARKET CONTEXT gives the Fear & Greed index on the day each position was opened. Use it
only where it separates this trader's winners from their losers; if it does not, leave
it out. It describes the conditions they chose to act in, never a prediction.`;

// Gemini takes plain JSON Schema; Zod generates it, and Zod validates what comes back.
const REPORT_JSON_SCHEMA = (() => {
  const schema = z.toJSONSchema(ReportSchema, { io: "output", reused: "inline" }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
})();

/** Compact JSON: the model reads it as well without indentation, at a fraction of the tokens. */
const j = (v: unknown) => JSON.stringify(v);

export function buildInput(args: {
  question: string;
  facts: Facts;
  replays: RuleReplay[];
  market: EntrySentiment;
  positions: Position[];
}) {
  const { question, facts, replays, market, positions } = args;
  return `The trader asks: "${question}"

FACTS (computed from their fills; the only numbers you may use):
${j(facts)}

REPLAY (their history re-run with one rule applied; delta = dollars the rule would have saved):
${j(
  replays
    .filter((r) => r.status === "computed")
    .map(({ rule, delta, actualPnl, replayedPnl, affected }) => ({ rule, delta, actualPnl, replayedPnl, positionIds: affected.map((a) => a.id) })),
)}

MARKET CONTEXT (Fear & Greed index on each entry day, 0 = extreme fear, 100 = extreme greed):
${j({ avgIndexAtLosingEntries: market.avgIndexAtLosingEntries, avgIndexAtWinningEntries: market.avgIndexAtWinningEntries, bands: market.bands })}

POSITIONS (each id maps to the trade ids that make it up):
${j(
  positions.map((p) => ({
    id: p.id, symbol: p.symbol, opened: p.openedAt, closed: p.closedAt,
    avgEntry: p.avgEntry, exit: p.exitPrice, pnl: p.pnl, pnlPct: p.pnlPct,
    addsDown: p.addsDown, holdHours: p.holdHours, tradeIds: p.tradeIds,
  })),
)}`;
}

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

export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

export type GeminiResult = { ok: true; text: string } | { ok: false; status: number; detail: string };
export type GeminiInput = string | ({ type: "text"; text: string } | { type: "image"; data: string; mime_type: string })[];

/** One structured-output call to one model, hard-capped. Throws on timeout or network failure. */
export async function callGemini(opts: {
  apiKey: string;
  model: string;
  system: string;
  input: GeminiInput;
  schema: Record<string, unknown>;
  timeoutMs: number;
  thinkingLevel?: ThinkingLevel;
}): Promise<GeminiResult> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "x-goog-api-key": opts.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      system_instruction: opts.system,
      input: opts.input,
      ...(opts.thinkingLevel ? { generation_config: { thinking_level: opts.thinkingLevel } } : {}),
      response_format: { type: "text", mime_type: "application/json", schema: opts.schema },
    }),
    signal: AbortSignal.timeout(opts.timeoutMs),
  });
  if (res.ok) return { ok: true, text: extractText(await res.json()) };
  return { ok: false, status: res.status, detail: (await res.text()).slice(0, 300) };
}

/** Zod schema → the plain JSON Schema Gemini accepts. */
export function toGeminiSchema(schema: z.ZodType) {
  const out = z.toJSONSchema(schema, { io: "output", reused: "inline" }) as Record<string, unknown>;
  delete out.$schema;
  return out;
}

/** The report call: one model, one attempt, hard-capped. */
export function callModel(opts: {
  apiKey: string;
  model: string;
  input: string;
  timeoutMs: number;
  thinkingLevel?: ThinkingLevel;
}): Promise<GeminiResult> {
  return callGemini({ ...opts, system: SYSTEM, schema: REPORT_JSON_SCHEMA });
}
