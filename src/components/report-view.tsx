"use client";

import type { Report } from "@/lib/report";
import type { Facts } from "@/lib/analysis";
import { Check } from "./icons";

const money = (n: number) =>
  `${n < 0 ? "−" : "+"}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

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
  const figures: [string, string, boolean][] = [
    ["Closed positions", String(facts.positions), false],
    ["Win rate", `${facts.winRate}%`, false],
    ["Net result", money(facts.netPnl), facts.netPnl < 0],
    ["Average winner", `+${facts.wins.avgPnlPct}%`, false],
    ["Average loser", `${facts.losses.avgPnlPct}%`, true],
  ];

  return (
    <section className="mt-20">
      <div className="relative text-center">
        <div aria-hidden className="beam -top-24 h-72 opacity-60" />
        <h2
          key={report.headline}
          className="headline verdict relative mx-auto max-w-[22ch] text-[clamp(2rem,4.6vw,3.75rem)] text-white"
        >
          {report.headline}
        </h2>
      </div>

      <dl className="panel mt-14 grid grid-cols-2 sm:grid-cols-5">
        {figures.map(([label, value, isLoss], i) => (
          <div
            key={label}
            className={`px-6 py-6 ${i > 0 ? "sm:border-l sm:border-line" : ""} ${i > 1 ? "border-t border-line sm:border-t-0" : ""}`}
          >
            <dd className={`tnum text-2xl font-semibold tracking-tight ${isLoss ? "text-loss" : "text-white"}`}>{value}</dd>
            <dt className="mt-1.5 text-xs text-grey">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-6 space-y-4">
        {report.patterns.map((p, i) => (
          <article key={p.title} className="panel reveal grid gap-8 p-7 sm:p-9 lg:grid-cols-[1fr_17rem]">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-line-strong font-mono text-xs text-grey">
                  {i + 1}
                </span>
                <span className="text-xs capitalize text-grey">{p.confidence} confidence</span>
              </div>
              <h3 className="headline mt-5 max-w-[26ch] text-2xl text-white sm:text-[1.75rem]">{p.title}</h3>
              <p className="mt-5 max-w-[64ch] text-[0.9375rem] leading-relaxed text-grey">{p.finding}</p>
              <p className="mt-4 max-w-[64ch] text-[0.9375rem] leading-relaxed text-white">{p.cost}</p>
            </div>

            <div className="flex flex-col justify-end border-t border-line pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <p className="text-xs text-grey">The trades behind this</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.evidence.map((id) => {
                  const on = selected.has(id);
                  return (
                    <button
                      key={id}
                      onClick={() => onSelect(p.evidence, id)}
                      aria-pressed={on}
                      className={`tnum rounded-full border px-3 py-1.5 font-mono text-xs transition-all duration-300 ${
                        on
                          ? "border-white bg-white text-void shadow-[0_0_24px_-2px_rgba(255,255,255,0.55)]"
                          : "border-line-strong text-white hover:border-white/40 hover:bg-white/[0.06]"
                      }`}
                    >
                      {id}
                    </button>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="panel reveal mt-4 p-7 sm:p-9">
        <h3 className="headline text-2xl text-white sm:text-[1.75rem]">Rules for your next trade</h3>
        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
          {report.checklist.map((rule) => (
            <li key={rule} className="flex gap-4 rounded-2xl border border-line bg-white/[0.02] p-4 text-sm leading-relaxed text-white">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line-strong bg-white/[0.04] text-white">
                <Check />
              </span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {dropped.length > 0 && (
        <p className="mt-5 text-center font-mono text-xs text-grey">
          {dropped.length} citation{dropped.length === 1 ? "" : "s"} ({dropped.join(", ")}) matched no trade in your
          file and {dropped.length === 1 ? "was" : "were"} removed.
        </p>
      )}
    </section>
  );
}
