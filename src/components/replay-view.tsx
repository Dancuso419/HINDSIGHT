"use client";

import { useState } from "react";
import type { RuleReplay } from "@/lib/replay";
import type { EntrySentiment } from "@/lib/market";

const dollars = (n: number) => `$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const signed = (n: number) => `${n < 0 ? "−" : "+"}${dollars(n)}`;

type Select = (evidence: string[], focus: string) => void;

function Chips({ ids, selected, onSelect }: { ids: string[]; selected: Set<string>; onSelect: Select }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <button
          key={id}
          onClick={() => onSelect(ids, id)}
          aria-pressed={selected.has(id)}
          className={`tnum rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all duration-300 ${
            selected.has(id)
              ? "border-white bg-white text-void shadow-[0_0_20px_-2px_rgba(255,255,255,0.5)]"
              : "border-line-strong text-white hover:border-white/40 hover:bg-white/[0.06]"
          }`}
        >
          {id}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------------ replay */

/**
 * Not a chart: each rule's job is one headline figure — what it would have changed — so it is
 * set as a number, with the before/after beneath it as text.
 */
export function ReplayView({
  replays,
  selected,
  onSelect,
}: {
  replays: RuleReplay[];
  selected: Set<string>;
  onSelect: Select;
}) {
  return (
    <section className="panel reveal mt-4 p-7 sm:p-9">
      <h3 className="headline text-2xl text-white sm:text-[1.75rem]">Your history, replayed with the rules</h3>
      <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-grey">
        Same trades, same exits, same timing. Only the decision the rule forbids is taken out. Each rule is replayed on
        its own, so the figures overlap and are not added together.
      </p>

      <div className="mt-8 grid gap-3 lg:grid-cols-3">
        {replays.map((r) => {
          const ok = r.status === "computed";
          const none = ok && r.affected.length === 0;
          return (
            <article
              key={r.id}
              className={`flex flex-col rounded-2xl border p-5 ${ok ? "border-line bg-white/[0.02]" : "border-dashed border-line-strong"}`}
            >
              <p className="text-sm leading-snug text-white">{r.rule}</p>

              {ok && !none && (
                <>
                  <p className={`tnum mt-6 text-4xl font-semibold tracking-tight ${r.delta >= 0 ? "text-white" : "text-loss"}`}>
                    {r.delta >= 0 ? dollars(r.delta) : `−${dollars(r.delta)}`}
                  </p>
                  <p className="mt-1 text-xs text-grey">
                    {r.delta >= 0 ? "would have been saved" : "this rule would have cost you on this history"}
                  </p>
                  <p className="tnum mt-4 font-mono text-[11px] text-grey">
                    {r.affected.length} position{r.affected.length === 1 ? "" : "s"} · {signed(r.actualPnl)} →{" "}
                    <span className="text-white">{signed(r.replayedPnl)}</span>
                  </p>
                  <div className="mt-4">
                    <Chips ids={r.affected.map((a) => a.id)} selected={selected} onSelect={onSelect} />
                  </div>
                  {r.source && <p className="mt-auto pt-4 font-mono text-[10px] text-grey-deep">prices via {r.source}</p>}
                </>
              )}

              {none && <p className="mt-6 text-sm text-grey">You never broke this rule in this history.</p>}

              {!ok && (
                <div className="mt-6">
                  <p className="flex items-center gap-2 text-xs text-white">
                    <span className="h-1.5 w-1.5 animate-[pulse-dot_1.6s_ease-in-out_infinite] rounded-full bg-white" />
                    Waiting on market data
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-grey">{r.reason}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------ market */

const SOURCE_NOTE: Record<EntrySentiment["source"], string> = {
  "bitget-signal": "Fear & Greed index via bitget-signal",
  "alternative.me": "Fear & Greed index via alternative.me, because bitget-signal did not answer, so its source was used directly",
  snapshot: "Fear & Greed index from a saved copy, because no live source answered",
};

/**
 * Ordered categories (the five index bands) × a part-to-whole count (won vs lost).
 * One horizontal stacked bar per band on a shared count axis; counts are direct-labelled,
 * a legend is present, every segment has a hover/focus tooltip, and a table view exists.
 */
export function MarketView({
  market,
  selected,
  onSelect,
}: {
  market: EntrySentiment;
  selected: Set<string>;
  onSelect: Select;
}) {
  const [tip, setTip] = useState<string | null>(null);
  const [asTable, setAsTable] = useState(false);
  const max = Math.max(1, ...market.bands.map((b) => b.opened));
  const lostAt = market.avgIndexAtLosingEntries;
  const wonAt = market.avgIndexAtWinningEntries;

  return (
    <section className="panel reveal mt-4 p-7 sm:p-9">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h3 className="headline text-2xl text-white sm:text-[1.75rem]">The market you chose to act in</h3>
          <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-grey">
            Sentiment on the day you opened each position. It does not say what the market did next, only the mood you
            were buying into.
          </p>
        </div>
        {lostAt !== null && wonAt !== null && (
          <dl className="flex gap-8">
            <div>
              <dd className="tnum text-3xl font-semibold tracking-tight text-loss">{lostAt}</dd>
              <dt className="mt-1 text-xs text-grey">avg index, losing entries</dt>
            </div>
            <div>
              <dd className="tnum text-3xl font-semibold tracking-tight text-white">{wonAt}</dd>
              <dt className="mt-1 text-xs text-grey">avg index, winning entries</dt>
            </div>
          </dl>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5 text-xs text-grey" aria-hidden={asTable}>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-won" /> won
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-loss" /> lost
          </span>
        </div>
        <button onClick={() => setAsTable((v) => !v)} className="text-xs text-grey underline-offset-4 hover:text-white hover:underline">
          {asTable ? "View as chart" : "View as table"}
        </button>
      </div>

      {asTable ? (
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-grey">
              <th className="py-2 font-normal">Band</th>
              <th className="py-2 text-right font-normal">Opened</th>
              <th className="py-2 text-right font-normal">Lost</th>
              <th className="py-2 text-right font-normal">Result</th>
            </tr>
          </thead>
          <tbody>
            {market.bands.map((b) => (
              <tr key={b.band} className="border-b border-line last:border-0">
                <td className="py-2.5 text-white">{b.band}</td>
                <td className="tnum py-2.5 text-right font-mono text-xs text-grey">{b.opened}</td>
                <td className="tnum py-2.5 text-right font-mono text-xs text-grey">{b.lost}</td>
                <td className={`tnum py-2.5 text-right font-mono text-xs ${b.pnl < 0 ? "text-loss" : "text-white"}`}>
                  {b.opened ? signed(b.pnl) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-5 space-y-3" onMouseLeave={() => setTip(null)}>
          {market.bands.map((b) => {
            const won = b.opened - b.lost;
            const tipText = `${b.band}: opened ${b.opened}, won ${won}, lost ${b.lost}, result ${b.opened ? signed(b.pnl) : "—"}`;
            return (
              <div key={b.band} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-4 sm:grid-cols-[9rem_1fr_14rem]">
                <span className="text-sm text-white">{b.band}</span>

                <div
                  className="relative flex h-6 items-center"
                  tabIndex={b.opened ? 0 : -1}
                  aria-label={tipText}
                  onMouseEnter={() => setTip(tipText)}
                  onFocus={() => setTip(tipText)}
                  onBlur={() => setTip(null)}
                >
                  {/* Hit target spans the whole row; the marks are thin inside it. */}
                  <div className="flex h-3 gap-[2px]" style={{ width: `${(b.opened / max) * 100}%` }}>
                    {won > 0 && (
                      <span className={`h-full rounded-l-[4px] bg-won ${b.lost === 0 ? "rounded-r-[4px]" : ""}`} style={{ flex: won }} />
                    )}
                    {b.lost > 0 && (
                      <span className={`h-full rounded-r-[4px] bg-loss ${won > 0 ? "" : "rounded-l-[4px]"}`} style={{ flex: b.lost }} />
                    )}
                  </div>
                  {b.opened > 0 && (
                    <span className="tnum ml-2 font-mono text-[11px] text-grey">
                      {b.opened} · {b.lost} lost
                    </span>
                  )}
                  {tip === tipText && (
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute -top-9 left-0 z-10 rounded-lg border border-line-strong bg-black/90 px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap text-white shadow-lg"
                    >
                      {tipText}
                    </span>
                  )}
                </div>

                <div className="hidden justify-end sm:flex">
                  {b.positionIds.length > 0 && <Chips ids={b.positionIds.slice(0, 6)} selected={selected} onSelect={onSelect} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 font-mono text-[10px] text-grey-deep">
        {SOURCE_NOTE[market.source]} · {market.coverage.matched} of {market.coverage.of} entries matched
      </p>
    </section>
  );
}
