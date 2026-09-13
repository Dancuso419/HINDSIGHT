"use client";

import { useEffect, useMemo, useState } from "react";
import { parseTrades, summarise, buildPositions, type ParseResult, type Position } from "@/lib/trades";
import { resolveEvidence, type Report } from "@/lib/report";
import type { Facts } from "@/lib/analysis";
import { ReportView } from "@/components/report-view";
import { PositionsTable } from "@/components/positions-table";
import { HowItWorks } from "@/components/how-it-works";
import { Terrain } from "@/components/terrain";
import { Mark, Upload, Sample, Arrow, ArrowDown, Lock } from "@/components/icons";

type Analysis = { report: Report; facts: Facts; positions: Position[]; dropped: string[] };

const DEMO_QUESTION = "Why do I keep losing money on tech-adjacent positions?";

/** Real figures computed from public/sample-trades.csv by the shipped pipeline. */
const TICKER = [
  "61 fills",
  "24 round trips",
  "70.8% win rate",
  "−$893 net",
  "winners held 5.9h",
  "losers held 100h",
  "5 positions averaged down",
  "all 5 lost",
  "3 revenge entries",
  "−$1,382 from adding to losers",
];

const PROMISES = [
  { title: "No journal to keep", body: "Export once from your exchange. No account, no tagging, no habit to build." },
  { title: "Counted, never guessed", body: "Every number is arithmetic on your fills, done before the model is involved." },
  { title: "Every claim cited", body: "Each finding names the trades behind it. A trade that isn't in your file is struck." },
];

export default function Home() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [source, setSource] = useState("");
  const [question, setQuestion] = useState(DEMO_QUESTION);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState<string | null>(null);
  const [landscape, setLandscape] = useState<number[] | null>(null);

  // The hero landscape is drawn from the sample history's real equity curve.
  useEffect(() => {
    fetch("/sample-trades.csv")
      .then((r) => r.text())
      .then((csv) => {
        let running = 0;
        const curve = [0];
        for (const p of buildPositions(parseTrades(csv).trades)) {
          if (p.pnl === null) continue;
          running += p.pnl;
          curve.push(running);
        }
        setLandscape(curve);
      })
      .catch(() => {});
  }, []);

  const load = (csv: string, name: string) => {
    setResult(parseTrades(csv));
    setSource(name);
    setAnalysis(null);
    setError(null);
    setSelected(new Set());
    setFocused(null);
  };

  const loadSample = async () => load(await (await fetch("/sample-trades.csv")).text(), "sample-trades.csv");

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

  const fileInput = (
    <input
      type="file"
      accept=".csv,text/csv"
      className="sr-only"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) load(await file.text(), file.name);
      }}
    />
  );

  return (
    <main>
      {/* ---------------------------------------------------------------- HERO */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <Terrain series={landscape} className="absolute inset-0 -z-10" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(255,255,255,0.08),transparent_70%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-void to-transparent" />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <span className="flex items-center gap-2.5 text-white">
            <Mark size={22} />
            <span className="text-[15px] font-semibold tracking-tight">Hindsight</span>
          </span>
          <span className="flex items-center gap-2 rounded-full border border-line bg-black/40 px-3 py-1.5 text-xs text-grey backdrop-blur">
            <Lock />
            Read-only — never places an order
          </span>
        </header>

        <div className="mx-auto mt-10 max-w-4xl px-6 text-center sm:mt-16">
          <h1 className="headline text-[clamp(2.5rem,6.4vw,5.25rem)] text-white">
            Your trades already know
            <br />
            <span className="text-white/55">what you keep getting wrong.</span>
          </h1>
          <p className="lead mx-auto mt-6 max-w-[46ch]">
            One CSV. One honest post-mortem. Every finding tied to the exact trades behind it.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="#run" className="btn-pill">
              Run the post-mortem
              <Arrow />
            </a>
            <a href="#how" className="btn-ghost">
              See how it works
            </a>
          </div>
        </div>

        <div className="relative mt-auto flex justify-center pb-[14vh]">
          <div aria-hidden className="beam top-14 h-[28vh]" />
          <div className="mark-tile text-white">
            <Mark size={34} />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- TICKER */}
      <section aria-label="Figures from the sample history" className="relative border-y border-line py-5">
        <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <div className="marquee">
            {[...TICKER, ...TICKER].map((item, i) => (
              <span key={i} className="flex items-center gap-8 pr-8 text-sm whitespace-nowrap text-grey">
                <span className={item.startsWith("−") || item.includes("lost") ? "text-loss" : ""}>{item}</span>
                <span aria-hidden className="h-1 w-1 rounded-full bg-grey-deep" />
              </span>
            ))}
          </div>
        </div>
        <p className="mt-3 text-center font-mono text-[10px] text-grey-deep">measured from the sample history</p>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        {/* ------------------------------------------------------------ WHAT */}
        <section className="pt-32 text-center sm:pt-40">
          <h2 className="headline reveal mx-auto max-w-[18ch] text-[clamp(2rem,4.2vw,3.25rem)] text-white">
            A post-mortem for traders who never kept a journal
          </h2>
          <p className="lead reveal mx-auto mt-5 max-w-[56ch]">
            Trading journals only work if you keep one. Hindsight reads the history you already have and tells you
            the habit that is costing you — once, with receipts.
          </p>

          <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
            {PROMISES.map((p, i) => (
              <div key={p.title} className="panel reveal flex items-start gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line-strong bg-gradient-to-b from-white/10 to-transparent font-mono text-sm text-white">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="font-medium text-white">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-grey">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------- HOW */}
        <section id="how" className="scroll-mt-10 pt-32 sm:pt-40">
          <div className="text-center">
            <h2 className="headline reveal text-[clamp(2rem,4.2vw,3.25rem)] text-white">How it works</h2>
            <p className="lead reveal mx-auto mt-5 max-w-[50ch]">
              Four steps. Only the last one uses a language model, and it only gets numbers it cannot change.
            </p>
          </div>
          <div className="mt-14">
            <HowItWorks />
          </div>
        </section>

        {/* -------------------------------------------------------- SHOWCASE */}
        <section className="pt-32 sm:pt-40">
          <div className="text-center">
            <h2 className="headline reveal text-[clamp(2rem,4.2vw,3.25rem)] text-white">What it tells you</h2>
            <p className="lead reveal mx-auto mt-5 max-w-[50ch]">A finding from the sample history, word for word.</p>
          </div>

          <figure className="panel reveal relative mt-14 overflow-hidden px-7 py-14 text-center sm:px-16 sm:py-20">
            <div className="dust" />
            <div aria-hidden className="beam -top-10 h-80 opacity-70" />
            <blockquote className="headline relative mx-auto max-w-[20ch] text-[clamp(1.75rem,3.6vw,2.75rem)] text-white">
              You average down into losing positions with a 100% loss rate.
            </blockquote>
            <p className="relative mx-auto mt-6 max-w-[58ch] text-[0.9375rem] leading-relaxed text-grey">
              Across 5 positions where you added to a falling trade, every one lost — averaging −12.97% over 112.6
              hours. <span className="text-loss">Adding to losers cost you −$1,382.50 of a −$1,704.75 total.</span>
            </p>
            <figcaption className="relative mt-8 flex flex-wrap items-center justify-center gap-2">
              {["P03", "P06", "P08", "P16", "P17"].map((id) => (
                <span key={id} className="rounded-full border border-line-strong bg-black/40 px-3 py-1.5 font-mono text-xs text-white">
                  {id}
                </span>
              ))}
            </figcaption>
          </figure>
        </section>

        {/* ------------------------------------------------------------- RUN */}
        <section id="run" className="scroll-mt-10 pt-32 sm:pt-40">
          <div className="text-center">
            <h2 className="headline reveal text-[clamp(2rem,4.2vw,3.25rem)] text-white">Run it on your trades</h2>
            <p className="lead reveal mx-auto mt-5 max-w-[50ch]">
              Nothing is stored — no account, no database. The analysis runs once and is gone when you close the tab.
            </p>
          </div>

          <div className="panel relative mt-14 overflow-hidden p-7 sm:p-10">
            <div className="dust opacity-40" />

            <div className="relative flex flex-wrap items-center gap-3">
              <label className="btn-pill cursor-pointer">
                <Upload />
                {result ? "Load a different CSV" : "Upload your CSV"}
                {fileInput}
              </label>
              <button onClick={loadSample} className="btn-ghost">
                <Sample />
                Use the sample history
              </button>
              {stats && (
                <span className="tnum ml-auto font-mono text-xs text-grey">
                  {source} · {stats.count} fills · {roundTrips} round trips · {stats.symbols.length} symbols
                </span>
              )}
            </div>

            {result && result.errors.length > 0 && (
              <div className="relative mt-6 rounded-xl border border-loss/30 bg-loss/[0.06] p-4">
                <p className="text-sm text-loss">
                  {result.errors.length} row{result.errors.length === 1 ? "" : "s"} could not be read
                </p>
                <ul className="mt-2 space-y-1 font-mono text-xs text-grey">
                  {result.errors.slice(0, 5).map((e) => (
                    <li key={e.row}>
                      line {e.row} — {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result ? (
              <div className="relative mt-10 border-t border-line pt-9">
                <label htmlFor="question" className="text-sm text-grey">
                  What do you want to know?
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={DEMO_QUESTION}
                    disabled={analysing}
                    className="min-w-0 flex-1 rounded-full border border-line-strong bg-black/50 px-6 py-3.5 text-[15px] text-white placeholder:text-grey-deep focus:border-white/50 focus:outline-none disabled:opacity-50"
                  />
                  <button onClick={analyse} disabled={analysing} className="btn-pill justify-center">
                    {analysing ? "Reading your trades" : "Analyse"}
                    <Arrow />
                  </button>
                </div>

                {analysing && (
                  <div className="mt-6">
                    <div className="relative h-px overflow-hidden rounded-full bg-line">
                      <span className="absolute inset-y-0 left-0 w-1/4 animate-[scan_1.6s_cubic-bezier(0.45,0,0.55,1)_infinite] bg-gradient-to-r from-transparent via-white to-transparent" />
                    </div>
                    <p className="mt-3 flex items-center gap-2 text-xs text-grey">
                      <span className="h-1.5 w-1.5 animate-[pulse-dot_1.2s_ease-in-out_infinite] rounded-full bg-white" />
                      Counting {stats?.count} fills across {roundTrips} round trips, then asking for the write-up.
                      This takes about 20 seconds.
                    </p>
                  </div>
                )}

                {error && <p className="mt-5 text-sm text-loss">{error}</p>}
              </div>
            ) : (
              <p className="relative mt-8 max-w-[52ch] text-sm leading-relaxed text-grey">
                No file handy? The sample history is 61 synthetic fills built to contain real, detectable habits —
                it runs the full analysis exactly as your own file would.
              </p>
            )}
          </div>

          {analysis && result && (
            <ReportView
              report={analysis.report}
              facts={analysis.facts}
              dropped={analysis.dropped}
              selected={selected}
              onSelect={selectEvidence}
            />
          )}

          {analysis && result && (
            <div className="mt-20">
              <div className="mb-6 flex flex-wrap items-end gap-4">
                <h3 className="headline text-2xl text-white sm:text-[1.75rem]">Every position, in order</h3>
                {selected.size > 0 && (
                  <button
                    onClick={() => {
                      setSelected(new Set());
                      setFocused(null);
                    }}
                    className="rounded-full border border-line-strong px-3 py-1 text-xs text-grey transition-colors hover:text-white"
                  >
                    Clear highlight
                  </button>
                )}
                <span className="ml-auto text-xs text-grey">Open a row to see the fills behind it</span>
              </div>
              <PositionsTable
                positions={analysis.positions}
                trades={result.trades}
                selected={selected}
                focused={focused}
              />
            </div>
          )}
        </section>
      </div>

      {/* ---------------------------------------------------------- FOOTER */}
      <footer className="mt-40 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-grey">
          <span className="flex items-center gap-2 text-white">
            <Mark size={18} />
            Hindsight
          </span>
          <span>Read-only. It reads your history and never touches your account.</span>
          <a href="#run" className="flex items-center gap-1.5 text-white hover:underline">
            Back to the tool
            <span className="inline-block rotate-180">
              <ArrowDown />
            </span>
          </a>
        </div>
      </footer>
    </main>
  );
}
