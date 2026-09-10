import { z } from "zod";

export const PatternSchema = z.object({
  title: z
    .string()
    .min(8)
    .max(120)
    .describe(
      `The pattern in one line, using the trader's own figures, e.g. "You cut winners at +4% but hold losers to -14%".`,
    ),
  finding: z
    .string()
    .min(40)
    .max(700)
    .describe(
      "Two to three sentences, second person, stating what the data shows. Every figure must come from FACTS verbatim.",
    ),
  cost: z
    .string()
    .min(20)
    .max(400)
    .describe("What this decision habit cost them, in their own numbers. About the decision, never about the market."),
  evidence: z
    .array(z.string())
    .min(1)
    .max(12)
    .describe("Position ids (P01) and/or trade ids (T0001) from the data that this claim rests on. Verbatim, no invented ids."),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("How well the cited data supports the claim. Few positions or a weak margin means low."),
});

export const ReportSchema = z.object({
  headline: z
    .string()
    .min(20)
    .max(200)
    .describe("The single most expensive habit in this history, stated in one sentence to the trader."),
  patterns: z.array(PatternSchema).min(1).max(3).describe("At most three patterns, most costly first."),
  checklist: z
    .array(z.string().min(10).max(200))
    .min(3)
    .max(6)
    .describe(
      "Rules this trader could have applied to the cited positions. Each one checkable before or during a trade.",
    ),
});

export type Report = z.infer<typeof ReportSchema>;
export type Pattern = z.infer<typeof PatternSchema>;

/**
 * Drop every citation that is not a real id from this user's data, and drop any pattern
 * left with nothing behind it. A claim the data cannot support does not reach the screen.
 */
export function enforceCitations(report: Report, validIds: Set<string>) {
  const dropped: string[] = [];
  const patterns = report.patterns
    .map((p) => {
      const evidence = p.evidence.filter((id) => validIds.has(id));
      if (evidence.length < p.evidence.length)
        dropped.push(...p.evidence.filter((id) => !validIds.has(id)));
      return { ...p, evidence };
    })
    .filter((p) => p.evidence.length > 0);

  return { report: { ...report, patterns }, dropped };
}
