"use client";

import { useEffect, useState } from "react";

/**
 * Four panels, four working diagrams. Every row, price and figure below is real output
 * from public/sample-trades.csv run through the shipped pipeline — nothing is illustrative.
 */

const ROWS = [
  "T0001  TSLA  buy   2.0161  469.41",
  "T0002  TSLA  buy   2.4796  442.06",
  "T0003  PLTR  buy   6.3167  183.70",
  "T0004  AMD   buy   2.4518  226.89",
  "T0005  AMD   sell  2.4518  234.00",
  "T0006  MSTR  buy   2.2494  324.46",
  "T0007  MSTR  buy   1.9382  310.88",
  "T0008  PLTR  buy   7.3284  174.04",
  "T0009  TSLA  buy   2.4588  416.30",
  "T0010  MSTR  buy   2.0784  297.86",
  "T0011  PLTR  sell 13.6450  184.01",
  "T0012  WMT   buy  10.4984  109.04",
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

/** 2 — T0014, T0016, T0017 and T0021 collapse into one decision: three buys down, one sell lower still. */
function Grouping() {
  const fills = [
    { id: "T0014", side: "buy", price: "368.84" },
    { id: "T0016", side: "buy", price: "352.39" },
    { id: "T0017", side: "buy", price: "336.67" },
    { id: "T0021", side: "sell", price: "297.30" },
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
        <span className="text-white">P05 · COIN</span>
        <span className="text-grey">2 adds down</span>
        <span className="tnum text-loss">−15.6%</span>
      </div>
    </div>
  );
}

/** 3 — the arithmetic, done before the model sees anything. */
function Counting() {
  const figures: [string, string][] = [
    ["78%", "win rate"],
    ["−$1,217", "net result"],
    ["−$1,497", "lost on 2 trades opened right after a loss"],
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
            <span className="tnum text-white">+3.9%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06]">
            <div className="h-full w-[41%] rounded-full bg-white" />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-grey">
            <span>avg loser</span>
            <span className="tnum text-loss">−9.4%</span>
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
  const chips = ["P06", "P05", "P10", "P99", "P04", "P35"];
  return (
    <div className="flex h-full flex-col justify-end">
      <p className="text-sm leading-snug text-white">
        Your five worst trades all have two adds below entry.
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
  { title: "Load your fills", body: "A CSV of your tokenized US stock trades. Buys, sells, quantities, prices.", Visual: FillsFeed },
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
