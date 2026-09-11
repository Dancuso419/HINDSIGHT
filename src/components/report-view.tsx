"use client";

import type { Report } from "@/lib/report";
import type { Facts } from "@/lib/analysis";
import { Checkbox } from "./icons";

const money = (n: number) =>
  `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

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
  const ledger: [string, string, string][] = [
    ["Closed positions", String(facts.positions), "text-bone"],
    ["Win rate", `${facts.winRate}%`, "text-bone"],
    ["Net P&L", money(facts.netPnl), facts.netPnl < 0 ? "text-clay" : "text-sage"],
    ["Average win", `+${facts.wins.avgPnlPct}%`, "text-sage"],
    ["Average loss", `${facts.losses.avgPnlPct}%`, "text-clay"],
  ];

  return (
    <section className="mt-20">
      <div className="border-t border-rule-gold pt-10">
        <dl className="flex flex-wrap gap-y-8">
          {ledger.map(([label, value, tone], i) => (
            <div key={label} className={`px-6 first:pl-0 ${i > 0 ? "border-l border-rule" : ""}`}>
              <dd className={`tnum font-mono text-2xl sm:text-[1.75rem] ${tone}`}>{value}</dd>
              <dt className="label mt-2">{label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-16 space-y-14">
        {report.patterns.map((p) => (
          <article key={p.title} className="border-t border-rule pt-8">
            <div className="flex items-start justify-between gap-8">
              <h3 className="display max-w-[24ch] text-2xl text-bone sm:text-[2rem]">{p.title}</h3>
              <span className="label shrink-0 pt-1">{p.confidence} confidence</span>
            </div>

            <p className="mt-6 max-w-[68ch] text-[0.9375rem] leading-relaxed text-bone-dim">{p.finding}</p>
            <p className="mt-4 max-w-[68ch] text-[0.9375rem] leading-relaxed text-gold">{p.cost}</p>

            <div className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-2">
              <span className="label mr-2">Proof</span>
              {p.evidence.map((id) => {
                const on = selected.has(id);
                return (
                  <button
                    key={id}
                    onClick={() => onSelect(p.evidence, id)}
                    aria-pressed={on}
                    className={`tnum rounded-none border px-2 py-1 font-mono text-xs transition-colors duration-150 ${
                      on
                        ? "border-gold bg-gold font-semibold text-ink"
                        : "border-rule-gold text-gold hover:bg-gold hover:text-ink"
                    }`}
                  >
                    {id}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-20 border-t border-rule-gold pt-8">
        <h3 className="display text-2xl text-gold sm:text-[2rem]">Rules for your next trade</h3>
        <ul className="mt-8 max-w-[72ch] divide-y divide-rule border-y border-rule">
          {report.checklist.map((rule) => (
            <li key={rule} className="flex gap-4 py-4 text-[0.9375rem] leading-relaxed text-bone">
              <span className="mt-0.5 shrink-0 text-gold-deep">
                <Checkbox />
              </span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {dropped.length > 0 && (
        <p className="mt-6 max-w-[68ch] font-mono text-xs leading-relaxed text-bone-dim">
          {dropped.length} citation{dropped.length === 1 ? "" : "s"} ({dropped.join(", ")}) matched no trade in this
          file and {dropped.length === 1 ? "was" : "were"} struck from the report.
        </p>
      )}
    </section>
  );
}
