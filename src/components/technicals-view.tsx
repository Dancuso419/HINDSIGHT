"use client";

import type { Technicals, TechSnapshot } from "@/lib/technicals";
import type { Facts } from "@/lib/analysis";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signedUsd = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/** One value on its 0–100 scale, with the conventional 30 and 70 reference lines. Labelled, not colour-coded. */
function RsiScale({ value }: { value: number }) {
  return (
    <div title={`RSI (14, daily) ${value}`}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-grey">RSI 14</span>
        <span className="tnum font-mono text-white">{value.toFixed(1)}</span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-white/[0.07]">
        {[30, 70].map((tick) => (
          <span key={tick} aria-hidden className="absolute -top-1 h-3.5 w-px bg-line-strong" style={{ left: `${tick}%` }} />
        ))}
        <span
          aria-hidden
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-void bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
          style={{ left: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
      <div className="tnum mt-1 flex justify-between font-mono text-[10px] text-grey-deep">
        <span>0</span>
        <span style={{ marginLeft: "22%" }}>30</span>
        <span style={{ marginRight: "22%" }}>70</span>
        <span>100</span>
      </div>
    </div>
  );
}

function Card({ t, record }: { t: TechSnapshot; record?: Facts["bySymbol"][number] }) {
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-white/[0.02] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-lg font-semibold tracking-tight text-white">{t.symbol}</h4>
        <span className="tnum font-mono text-sm text-white">{usd(t.price)}</span>
      </div>
      <p className="font-mono text-[10px] text-grey-deep">{t.pair} · daily</p>

      {record && (
        <p className="mt-4 rounded-xl border border-line bg-black/30 px-3 py-2 text-xs text-grey">
          You: {record.positions} position{record.positions === 1 ? "" : "s"}, {record.wins} won ·{" "}
          <span className={`tnum font-mono ${record.pnl < 0 ? "text-loss" : "text-white"}`}>{signedUsd(record.pnl)}</span>
        </p>
      )}

      <div className="mt-5">
        <RsiScale value={t.rsi} />
      </div>

      <dl className="mt-5 space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-grey">Price vs average</dt>
          <dd className="flex gap-1.5">
            {t.averages.map((a) => (
              <span
                key={a.days}
                title={`${a.days}-day average ${usd(a.value)}`}
                className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${
                  a.above ? "border-white/40 text-white" : "border-line text-grey"
                }`}
              >
                {a.days}d {a.above ? "above" : "below"}
              </span>
            ))}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-grey">MACD histogram</dt>
          <dd className="tnum font-mono text-white">
            {t.macdHistogram > 0 ? "+" : ""}
            {t.macdHistogram.toFixed(2)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-grey">Average daily range</dt>
          <dd className="tnum font-mono text-white">{t.dailyRangePct.toFixed(2)}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-grey">Nearest support / resistance</dt>
          <dd className="tnum font-mono text-white">
            {t.support ? usd(t.support) : "—"} / {t.resistance ? usd(t.resistance) : "—"}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function TechnicalsView({ technicals, facts }: { technicals: Technicals; facts: Facts }) {
  const bySymbol = new Map(facts.bySymbol.map((b) => [b.symbol, b]));
  // Worst record first, so the stocks that cost the most sit at the front.
  const ordered = [...technicals.snapshots].sort(
    (a, b) => (bySymbol.get(a.symbol)?.pnl ?? 0) - (bySymbol.get(b.symbol)?.pnl ?? 0),
  );
  const fetched = new Date(technicals.fetchedAt).toUTCString().slice(17, 22);

  return (
    <section className="panel reveal mt-4 p-7 sm:p-9">
      <h3 className="headline text-2xl text-white sm:text-[1.75rem]">Where the stocks you traded stand today</h3>
      <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-grey">
        Your record in each stock beside its current daily technical picture. This is context for reading the post-mortem,
        not a signal. Nothing here says what to do next, and none of it was used to write the report above.
      </p>

      {ordered.length ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((t) => (
            <Card key={t.symbol} t={t} record={bySymbol.get(t.symbol)} />
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-line-strong p-5 text-sm text-grey">
          bitget-signal returned no technical data for these symbols right now.
        </p>
      )}

      <p className="mt-6 max-w-[80ch] font-mono text-[10px] leading-relaxed text-grey-deep">
        Technical analysis via bitget-signal, tokenized /USDT pairs, fetched {fetched} UTC.
        {technicals.missing.length > 0 && ` No data for ${technicals.missing.join(", ")}.`} Bollinger bands and the Skill&apos;s
        overall verdict are not shown: the bands arrive with upper and lower swapped, and the verdict is built partly on them.
      </p>
    </section>
  );
}
