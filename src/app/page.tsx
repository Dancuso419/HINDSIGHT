"use client";

import { useMemo, useState } from "react";
import { parseTrades, summarise, type ParseResult, type Position } from "@/lib/trades";
import { resolveEvidence, type Report } from "@/lib/report";
import type { Facts } from "@/lib/analysis";
import { ReportView } from "@/components/report-view";
import { PositionsTable } from "@/components/positions-table";

type Analysis = { report: Report; facts: Facts; positions: Position[]; dropped: string[] };

const DEMO_QUESTION = "Why do I keep losing money on tech-adjacent positions?";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

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
      if (!res.ok) setError(data.error ?? "Analysis failed.");
      else setAnalysis(data);
    } catch {
      setError("Could not reach the analysis endpoint.");
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

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Hindsight</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-black/60 dark:text-white/60">
          Upload your trade history. Get a post-mortem of the decisions behind it — the patterns you
          repeat, the trades that prove it, and a checklist for the next one. Every claim below links
          to the positions it came from.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
          Upload CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) load(await file.text(), file.name);
            }}
          />
        </label>
        <button
          onClick={async () => load(await (await fetch("/sample-trades.csv")).text(), "sample-trades.csv")}
          className="rounded-md border border-black/15 px-4 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Use sample history
        </button>
        {source && (
          <span className="text-sm text-black/50 dark:text-white/50">
            {source}
            {stats && ` — ${stats.count} fills, ${stats.symbols.length} symbols, ${day(stats.from)} → ${day(stats.to)}, ${money(stats.volume)} traded`}
          </span>
        )}
      </div>

      {result && (
        <>
          {result.errors.length > 0 && (
            <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/5 p-4 text-sm">
              <p className="font-medium">{result.errors.length} row(s) could not be read</p>
              <ul className="mt-2 space-y-1 text-black/70 dark:text-white/70">
                {result.errors.slice(0, 5).map((e) => (
                  <li key={e.row}>
                    Row {e.row} — {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 rounded-lg border border-black/10 p-5 dark:border-white/15">
            <label htmlFor="question" className="text-sm font-medium">
              What do you want to know about your trading?
            </label>
            <div className="mt-3 flex flex-wrap gap-3">
              <input
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={DEMO_QUESTION}
                className="min-w-0 flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
              />
              <button
                onClick={analyse}
                disabled={analysing}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {analysing ? "Reading your decisions…" : "Analyse"}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>

          {analysis && (
            <ReportView
              report={analysis.report}
              facts={analysis.facts}
              dropped={analysis.dropped}
              selected={selected}
              onSelect={selectEvidence}
            />
          )}

          <div className="mt-10">
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
                {analysis ? "Your positions" : "Your fills"}
              </h2>
              {selected.size > 0 && (
                <button
                  onClick={() => {
                    setSelected(new Set());
                    setFocused(null);
                  }}
                  className="text-xs text-black/50 underline underline-offset-2 hover:text-foreground dark:text-white/50"
                >
                  clear highlight
                </button>
              )}
              <span className="ml-auto text-xs text-black/40 dark:text-white/40">
                {analysis ? "▸ expands the fills behind a position" : "positions appear once analysed"}
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
              <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
                <table className="w-full text-sm">
                  <thead className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-black/50 dark:border-white/15 dark:text-white/50">
                    <tr>
                      {["ID", "Time", "Symbol", "Side", "Qty", "Price", "Value"].map((h) => (
                        <th key={h} className="px-4 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t) => (
                      <tr key={t.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                        <td className="px-4 py-2 font-mono text-xs text-black/50 dark:text-white/50">{t.id}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {t.timestamp.slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="px-4 py-2 font-medium">{t.symbol}</td>
                        <td className={`px-4 py-2 ${t.side === "buy" ? "text-emerald-600" : "text-red-600"}`}>
                          {t.side}
                        </td>
                        <td className="px-4 py-2 tabular-nums">{t.qty}</td>
                        <td className="px-4 py-2 tabular-nums">{t.price}</td>
                        <td className="px-4 py-2 tabular-nums">{money(t.qty * t.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
