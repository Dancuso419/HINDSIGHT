"use client";

import type { Report } from "@/lib/report";
import type { Facts } from "@/lib/analysis";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function ReportView({
  report,
  facts,
  dropped,
  selected,
  onSelect,
}: {
  report: Report;
  facts: Facts;
  dropped: string[];
  selected: Set<string>;
  onSelect: (evidence: string[], focus: string) => void;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-medium leading-snug tracking-tight">{report.headline}</h2>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-black/10 bg-black/10 sm:grid-cols-4 dark:border-white/15 dark:bg-white/15">
        {[
          ["Closed positions", String(facts.positions)],
          ["Win rate", `${facts.winRate}%`],
          ["Net P&L", money(facts.netPnl)],
          ["Avg win / avg loss", `${facts.wins.avgPnlPct}% / ${facts.losses.avgPnlPct}%`],
        ].map(([label, value]) => (
          <div key={label} className="bg-background p-4">
            <dt className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">{label}</dt>
            <dd className="mt-1 text-lg font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <ol className="mt-8 space-y-6">
        {report.patterns.map((p, i) => (
          <li key={p.title} className="rounded-lg border border-black/10 p-5 dark:border-white/15">
            <div className="flex items-baseline gap-3">
              <span className="text-xs tabular-nums text-black/40 dark:text-white/40">{i + 1}</span>
              <h3 className="font-medium">{p.title}</h3>
              <span className="ml-auto shrink-0 text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
                {p.confidence}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-black/75 dark:text-white/75">{p.finding}</p>
            <p className="mt-2 text-sm leading-relaxed text-black/75 dark:text-white/75">{p.cost}</p>

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
                Evidence
              </span>
              {p.evidence.map((id) => (
                <button
                  key={id}
                  onClick={() => onSelect(p.evidence, id)}
                  title={`Show ${id} in the positions below`}
                  className={`rounded border px-1.5 py-0.5 font-mono text-xs transition-colors ${
                    selected.has(id)
                      ? "border-amber-500 bg-amber-400/20 text-amber-800 dark:text-amber-300"
                      : "border-black/15 text-black/60 hover:border-black/40 dark:border-white/20 dark:text-white/60 dark:hover:border-white/50"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-lg border border-black/10 p-5 dark:border-white/15">
        <h3 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
          Your checklist
        </h3>
        <ul className="mt-4 space-y-3">
          {report.checklist.map((rule) => (
            <li key={rule} className="flex gap-3 text-sm leading-relaxed">
              <span aria-hidden className="mt-px text-black/30 dark:text-white/30">
                ☐
              </span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {dropped.length > 0 && (
        <p className="mt-4 text-xs text-black/50 dark:text-white/50">
          {dropped.length} citation{dropped.length === 1 ? "" : "s"} ({dropped.join(", ")}) did not match a trade in
          your file and {dropped.length === 1 ? "was" : "were"} removed from this report.
        </p>
      )}
    </section>
  );
}
