"use client";

import { useState } from "react";
import { parseTrades, summarise, type ParseResult, type Trade } from "@/lib/trades";
import type { Report } from "@/lib/report";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

export default function Home() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [source, setSource] = useState<string>("");
  const [report, setReport] = useState<Report | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = (csv: string, name: string) => {
    setResult(parseTrades(csv));
    setSource(name);
    setReport(null);
    setError(null);
  };

  const analyse = async (trades: Trade[]) => {
    setAnalysing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Analysis failed.");
      else setReport(data.report);
    } catch {
      setError("Could not reach the analysis endpoint.");
    } finally {
      setAnalysing(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (file) load(await file.text(), file.name);
  };

  const stats = result && summarise(result.trades);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Hindsight</h1>
      <p className="mt-2 max-w-xl text-sm text-black/60 dark:text-white/60">
        Upload your trade history. Get a post-mortem of the decisions behind it — the patterns you
        repeat, the trades that prove it, and a checklist for the next one.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
          Upload CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        <button
          onClick={async () => load(await (await fetch("/sample-trades.csv")).text(), "sample-trades.csv")}
          className="rounded-md border border-black/15 px-4 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Use sample history
        </button>
        {source && <span className="text-sm text-black/50 dark:text-white/50">{source}</span>}
      </div>

      {stats && (
        <>
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-black/10 bg-black/10 sm:grid-cols-4 dark:border-white/15 dark:bg-white/15">
            {[
              ["Trades", String(stats.count)],
              ["Symbols", String(stats.symbols.length)],
              ["Period", `${day(stats.from)} → ${day(stats.to)}`],
              ["Volume", money(stats.volume)],
            ].map(([label, value]) => (
              <div key={label} className="bg-background p-4">
                <dt className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">{label}</dt>
                <dd className="mt-1 text-lg font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => analyse(result!.trades)}
              disabled={analysing}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {analysing ? "Reading your decisions…" : "Analyse my decisions"}
            </button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>

          {report && (
            <section className="mt-8 rounded-lg border border-black/10 p-6 dark:border-white/15">
              <h2 className="text-xl font-medium tracking-tight">{report.headline}</h2>

              <ol className="mt-6 space-y-6">
                {report.patterns.map((p, i) => (
                  <li key={p.title} className="border-t border-black/10 pt-5 first:border-0 first:pt-0 dark:border-white/15">
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs tabular-nums text-black/40 dark:text-white/40">{i + 1}</span>
                      <h3 className="font-medium">{p.title}</h3>
                      <span className="ml-auto text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
                        {p.confidence} confidence
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-black/70 dark:text-white/70">{p.finding}</p>
                    <p className="mt-2 text-sm text-black/70 dark:text-white/70">{p.cost}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.evidence.map((id) => (
                        <span
                          key={id}
                          className="rounded border border-black/15 px-1.5 py-0.5 font-mono text-xs text-black/60 dark:border-white/20 dark:text-white/60"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>

              <h3 className="mt-8 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
                Your checklist
              </h3>
              <ul className="mt-3 space-y-2">
                {report.checklist.map((rule) => (
                  <li key={rule} className="flex gap-3 text-sm">
                    <span aria-hidden className="text-black/30 dark:text-white/30">☐</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result!.errors.length > 0 && (
            <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/5 p-4 text-sm">
              <p className="font-medium">{result!.errors.length} row(s) could not be read</p>
              <ul className="mt-2 space-y-1 text-black/70 dark:text-white/70">
                {result!.errors.slice(0, 5).map((e) => (
                  <li key={e.row}>
                    Row {e.row} — {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
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
                {result!.trades.map((t) => (
                  <tr key={t.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                    <td className="px-4 py-2 font-mono text-xs text-black/50 dark:text-white/50">{t.id}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{t.timestamp.slice(0, 16).replace("T", " ")}</td>
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
        </>
      )}
    </main>
  );
}
