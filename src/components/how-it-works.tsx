"use client";

import { useEffect, useState } from "react";

/**
 * Four panels, four working diagrams. Every row, price and figure below is real output
 * from public/sample-trades.csv run through the shipped pipeline — nothing is illustrative.
 */

const ROWS = [
  "T0001  NVDA  buy   5.6908  114.07",
  "T0002  NVDA  sell  5.6908  119.10",
  "T0003  SOL   buy   6.6558  133.46",
  "T0004  SOL   sell  6.6558  140.51",
  "T0005  COIN  buy   2.1662  227.50",
  "T0006  COIN  buy   2.8914  218.79",
  "T0007  COIN  buy   2.8047  209.61",
  "T0008  COIN  sell  7.8623  195.75",
  "T0009  SOL   buy  13.1043  149.99",
  "T0010  SOL   sell 13.1043  154.76",
  "T0011  SOL   buy   3.7602  153.34",
  "T0012  SOL   sell  3.7602  160.03",
];

/** 1 — raw fills scroll past, as they arrive from an exchange export. */
function FillsFeed() {
  return (
    <div className="relative h-full overflow-hidden [mask-image:linear-gradient(180deg,transparent,black_25%,black_75%,transparent)]">
      <div className="animate-[feed_18s_linear_infinite] space-y-2.5 font-mono text-[11px] leading-none text-grey motion-reduce:animate-none">
        {[...ROWS, ...ROWS].map((row, i) => (
          <p key={i} className={`whitespace-pre ${row.includes("sell") ? "text-white/80" : ""}`}>
            {row}
          </p>
        ))}
      </div>
    </div>
  );
}

/** 2 — T0005-T0008 collapse into one decision: three buys down, one sell lower still. */
function Grouping() {
  const fills = [
    { id: "T0005", side: "buy", price: "227.50", y: 0 },
    { id: "T0006", side: "buy", price: "218.79", y: 1 },
    { id: "T0007", side: "buy", price: "209.61", y: 2 },
    { id: "T0008", side: "sell", price: "195.75", y: 3 },
  ];
  return (
    <div className="relative flex h-full flex-col justify-center gap-2 px-1">
      {fills.map((f, i) => (
        <div
          key={f.id}
          style={{ animationDelay: `${i * 0.12}s` }}
          className="flex animate-[gather_6s_cubic-bezier(0.16,1,0.3,1)_infinite] items-center justify-between rounded-lg border border-line bg-white/[0.03] px-3 py-2 font-mono text-[11px] motion-reduce:animate-none"
        >
          <span className="text-grey">{f.id}</span>
          <span className={f.side === "sell" ? "text-loss" : "text-white"}>{f.side}</span>
          <span className="tnum text-white">{f.price}</span>
        </div>
      ))}
      <div className="mt-2 flex items-center justify-between rounded-lg border border-line-strong bg-white/[0.06] px-3 py-2.5 font-mono text-[11px] animate-[settle_6s_ease-in-out_infinite] motion-reduce:animate-none">
        <span className="text-white">P03 · COIN</span>
        <span className="text-grey">2 adds down</span>
        <span className="tnum text-loss">−10.3%</span>
      </div>
    </div>
  );
}

/** 3 — the arithmetic, done before the model sees anything. */
function Counting() {
  const figures: [string, string][] = [
    ["70.8%", "win rate"],
    ["−$893", "net result"],
    ["100%", "of averaged-down trades lost"],
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % figures.length), 2600);
    return () => clearInterval(id);
  }, [figures.length]);

  return (
    <div className="flex h-full flex-col justify-end">
      <div className="relative h-16 overflow-hidden">
        {figures.map(([value, label], k) => (
          <div
            key={label}
            className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              k === i ? "translate-y-0 opacity-100 blur-0" : k < i ? "-translate-y-6 opacity-0 blur-sm" : "translate-y-6 opacity-0 blur-sm"
            }`}
          >
            <p className={`tnum text-4xl font-semibold tracking-tight ${value.startsWith("−") ? "text-loss" : "text-white"}`}>
              {value}
            </p>
            <p className="mt-1 text-xs text-grey">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3 font-mono text-[11px]">
        <div>
          <div className="mb-1.5 flex justify-between text-grey">
            <span>avg winner</span>
            <span className="tnum text-white">+4.1%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06]">
            <div className="h-full w-[28%] rounded-full bg-white" />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-grey">
            <span>avg loser</span>
            <span className="tnum text-loss">−14.4%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06]">
            <div className="h-full w-full rounded-full bg-loss" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 4 — citations light up; one that does not exist gets struck before render. */
function Citing() {
  const chips = ["P03", "P06", "P08", "P99", "P16", "P17"];
  return (
    <div className="flex h-full flex-col justify-end">
      <p className="text-sm leading-snug text-white">
        You average down into losers — every one of them lost.
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {chips.map((id, i) => {
          const fake = id === "P99";
          return (
            <span
              key={id}
              style={{ animationDelay: `${i * 0.45}s` }}
              className={`rounded-md border px-2 py-1 font-mono text-[11px] motion-reduce:animate-none ${
                fake
                  ? "animate-[strike-out_5.4s_ease-in-out_infinite] border-loss/40 text-loss"
                  : "animate-[light_5.4s_ease-in-out_infinite] border-line-strong text-grey"
              }`}
            >
              {id}
            </span>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[10px] text-grey-deep">P99 is not in the file — removed before render</p>
    </div>
  );
}

const STEPS = [
  { title: "Load your fills", body: "A CSV from any exchange. Buys, sells, quantities, prices.", Visual: FillsFeed },
  { title: "Grouped into decisions", body: "Fills become round trips — what you paid, what you added, when you left.", Visual: Grouping },
  { title: "Counted in code", body: "Every figure is arithmetic on your data, finished before the model is asked.", Visual: Counting },
  { title: "Named, and cited", body: "The model names the habit and points at the trades. Invented ones are struck.", Visual: Citing },
];

export function HowItWorks() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map(({ title, body, Visual }, i) => (
        <article
          key={title}
          className="panel reveal flex h-[26rem] flex-col p-6"
          style={{ animationRangeStart: `entry ${i * 6}%` }}
        >
          <span className="tnum font-mono text-[11px] text-grey-deep">0{i + 1}</span>
          <h3 className="mt-3 text-lg font-medium tracking-tight text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-grey">{body}</p>
          <div className="mt-6 min-h-0 flex-1">
            <Visual />
          </div>
        </article>
      ))}
    </div>
  );
}
