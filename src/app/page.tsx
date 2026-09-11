"use client";

import { useMemo, useState } from "react";
import { parseTrades, summarise, buildPositions, type ParseResult, type Position } from "@/lib/trades";
import { resolveEvidence, type Report } from "@/lib/report";
import type { Facts } from "@/lib/analysis";
import { ReportView } from "@/components/report-view";
import { PositionsTable } from "@/components/positions-table";
import { Upload, Sample, Arrow } from "@/components/icons";

type Analysis = { report: Report; facts: Facts; positions: Position[]; dropped: string[] };

const DEMO_QUESTION = "Why do I keep losing money on tech-adjacent positions?";

export default function Home() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [source, setSource] = useState("");
  const [question, setQuestion] = useState(DEMO_QUESTION);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState<string | null>(null);

  const load = (csv: string, name: string) => {
    setResult(parseTrades(csv));
    setSource(name);
    setAnalysis(null);
    setError(null);
    setSelected(new Set());
    setFocused(null);
  };

  const analyse = async () => {
    if (!result) return;
    setAnalysing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades: result.trades, question }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "The analysis did not come back.");
      else setAnalysis(data);
    } catch {
      setError("Could not reach the analysis service.");
    } finally {
      setAnalysing(false);
    }
  };

  const selectEvidence = (evidence: string[], focus: string) => {
    if (!analysis) return;
    const { selected, focused } = resolveEvidence(analysis.positions, evidence, focus);
    setSelected(selected);
    setFocused(focused);
  };

  const stats = useMemo(() => (result ? summarise(result.trades) : null), [result]);
  const roundTrips = useMemo(
    () => (result ? buildPositions(result.trades).filter((p) => p.pnl !== null).length : 0),
    [result],
  );

  return (
    <div className="mx-auto min-h-screen max-w-[1180px] border-x border-rule px-6 pb-32 sm:px-12">
      <header className="flex items-baseline justify-between gap-6 border-b border-rule py-5">
        <span className="display text-lg tracking-tight text-gold">Hindsight</span>
        <span className="label text-right">Read-only · never places an order</span>
      </header>

      <section className="pt-16 sm:pt-24">
        {analysis ? (
          <h1 key={analysis.report.headline} className="display verdict max-w-[16ch] text-[clamp(2.5rem,7vw,5.5rem)] text-gold">
            {analysis.report.headline}
          </h1>
        ) : (
          <h1 className="display max-w-[15ch] text-[clamp(2.5rem,7.5vw,6rem)] text-bone">
            Your trade history already knows what you keep doing wrong.
          </h1>
        )}

        {!analysis && (
          <p className="mt-8 max-w-[54ch] text-[0.9375rem] leading-relaxed text-bone-dim">
            Load the fills, ask one question, and read the answer against the trades that produced it. No account,
            nothing to maintain, no figure the model was free to invent.
          </p>
        )}
      </section>

      <section className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-rule pt-6">
        <label className="group flex cursor-pointer items-center gap-2.5 text-sm text-bone transition-colors hover:text-gold">
          <span className="text-gold">
            <Upload />
          </span>
          Upload a CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) load(await file.text(), file.name);
            }}
          />
        </label>

        <button
          onClick={async () => load(await (await fetch("/sample-trades.csv")).text(), "sample-trades.csv")}
          className="flex items-center gap-2.5 text-sm text-bone transition-colors hover:text-gold"
        >
          <span className="text-gold">
            <Sample />
          </span>
          Use the sample history
        </button>

        {stats && (
          <span className="label tnum ml-auto">
            {source} · {stats.count} fills · {roundTrips} round trips · {stats.symbols.length} symbols ·{" "}
            {stats.from?.slice(0, 10)} → {stats.to?.slice(0, 10)}
          </span>
        )}
      </section>

      {result?.errors.length ? (
        <div className="mt-8 border-l-2 border-clay pl-4">
          <p className="font-mono text-xs tracking-wide text-clay">
            {result.errors.length} row{result.errors.length === 1 ? "" : "s"} could not be read
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-bone-dim">
            {result.errors.slice(0, 5).map((e) => (
              <li key={e.row}>
                line {e.row} — {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result && (
        <>
          <section className="mt-16 border-t border-rule-gold pt-8">
            <label htmlFor="question" className="display block text-xl text-bone sm:text-2xl">
              What do you want to know?
            </label>

            <div className="mt-6 flex flex-wrap items-end gap-4">
              <input
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={DEMO_QUESTION}
                disabled={analysing}
                className="min-w-0 flex-1 border-b border-rule-gold bg-transparent pb-3 text-lg text-bone placeholder:text-bone-dim/60 focus:border-gold focus:outline-none disabled:opacity-50 sm:text-xl"
              />
              <button
                onClick={analyse}
                disabled={analysing}
                className="flex items-center gap-2.5 bg-gold px-5 py-3 text-sm font-semibold text-ink transition-opacity hover:opacity-85 disabled:opacity-40"
              >
                {analysing ? "Reading" : "Analyse"}
                <Arrow />
              </button>
            </div>

            {analysing && (
              <p className="label mt-5 flex items-center gap-3">
                <span aria-hidden className="relative block h-px w-24 overflow-hidden bg-rule">
                  <span className="absolute inset-y-0 left-0 w-1/3 animate-[strike_1.4s_ease-in-out_infinite] bg-gold" />
                </span>
                Reading {stats?.count} fills across {roundTrips} round trips
              </p>
            )}

            {error && <p className="mt-5 max-w-[60ch] font-mono text-xs leading-relaxed text-clay">{error}</p>}
          </section>

          {analysis && (
            <ReportView
              report={analysis.report}
              facts={analysis.facts}
              dropped={analysis.dropped}
              selected={selected}
              onSelect={selectEvidence}
            />
          )}

          <section className="mt-20">
            <div className="flex flex-wrap items-baseline gap-4 border-t border-rule-gold pt-8 pb-6">
              <h2 className="display text-xl text-bone sm:text-2xl">
                {analysis ? "Every position, in order" : "Every fill you loaded"}
              </h2>
              {selected.size > 0 && (
                <button
                  onClick={() => {
                    setSelected(new Set());
                    setFocused(null);
                  }}
                  className="label text-gold underline-offset-4 hover:underline"
                >
                  Clear proof
                </button>
              )}
              <span className="label ml-auto">
                {analysis ? "Open a row for the fills behind it" : "Positions appear once analysed"}
              </span>
            </div>

            {analysis ? (
              <PositionsTable
                positions={analysis.positions}
                trades={result.trades}
                selected={selected}
                focused={focused}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-y border-rule">
                      {["Trade", "Time", "Symbol", "Side", "Qty", "Price"].map((h, i) => (
                        <th
                          key={h}
                          className={`label py-3 font-normal ${i === 0 ? "pl-0 text-left" : i > 3 ? "px-4 text-right" : "px-4 text-left"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t) => (
                      <tr key={t.id} className="border-b border-rule">
                        <td className="py-2.5 pl-0 font-mono text-xs text-bone-dim">{t.id}</td>
                        <td className="tnum px-4 py-2.5 font-mono text-xs whitespace-nowrap text-bone-dim">
                          {t.timestamp.slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="px-4 py-2.5 text-bone">{t.symbol}</td>
                        <td className={`px-4 py-2.5 font-mono text-xs ${t.side === "buy" ? "text-sage" : "text-clay"}`}>
                          {t.side}
                        </td>
                        <td className="tnum px-4 py-2.5 text-right font-mono text-xs text-bone-dim">{t.qty}</td>
                        <td className="tnum px-4 py-2.5 text-right font-mono text-xs text-bone-dim">{t.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
