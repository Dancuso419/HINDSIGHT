"use client";

import { useEffect, useRef, useState } from "react";
import type { Position, Trade } from "@/lib/trades";
import { Chevron } from "./icons";

const money = (n: number | null) =>
  n === null ? "—" : `${n < 0 ? "−" : "+"}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const pct = (n: number | null) => (n === null ? "" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);
const held = (h: number | null) => (h === null ? "—" : h < 24 ? `${h.toFixed(0)}h` : `${(h / 24).toFixed(1)}d`);

export function PositionsTable({
  positions,
  trades,
  selected,
  focused,
}: {
  positions: Position[];
  trades: Trade[];
  selected: Set<string>;
  focused: string | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastFocused, setLastFocused] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLTableRowElement>());

  // Clicking a claim's proof opens the position it rests on — adjusted during render so a
  // later manual toggle still wins.
  if (focused !== lastFocused) {
    setLastFocused(focused);
    setExpanded(focused);
  }

  useEffect(() => {
    if (focused) rows.current.get(focused)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focused]);

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            {["", "Position", "Symbol", "Opened", "Held", "Adds", "Entry → exit", "Result"].map((h, i) => (
              <th
                key={i}
                className={`px-4 py-4 text-xs font-normal text-grey ${i === 0 ? "w-10 pl-5" : ""} ${i >= 4 ? "text-right" : "text-left"} ${i === 7 ? "pr-6" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const isProof = selected.has(p.id);
            const isOpen = expanded === p.id;
            const fills = trades.filter((t) => p.tradeIds.includes(t.id));
            return (
              <tr
                key={p.id}
                ref={(el) => {
                  if (el) rows.current.set(p.id, el);
                }}
                className={`border-b border-line align-top transition-colors duration-500 last:border-0 ${
                  isProof ? "bg-white/[0.06] shadow-[inset_2px_0_0_0_#f5f5f5]" : "hover:bg-white/[0.02]"
                }`}
              >
                <td className="py-3.5 pl-5">
                  <button
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "Hide" : "Show"} the fills behind ${p.id}`}
                    className="grid h-6 w-6 place-items-center rounded-md text-grey transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Chevron open={isOpen} />
                  </button>
                </td>

                <td className="px-4 py-3.5">
                  <span className={`font-mono text-xs ${isProof ? "font-semibold text-white" : "text-grey"}`}>
                    {p.id}
                  </span>
                  {isProof && <span className="sr-only"> — cited as proof</span>}

                  {isOpen && (
                    <ul className="mt-3 space-y-1.5 rounded-xl border border-line bg-black/40 p-3 font-mono text-[11px] text-grey">
                      {fills.map((f) => (
                        <li key={f.id} className="tnum whitespace-nowrap">
                          <span className="text-grey-deep">{f.id}</span> {f.timestamp.slice(0, 16).replace("T", " ")}{" "}
                          <span className={f.side === "buy" ? "text-white" : "text-loss"}>{f.side.padEnd(4, " ")}</span>{" "}
                          {f.qty} @ {f.price}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>

                <td className="px-4 py-3.5 font-medium text-white">{p.symbol}</td>
                <td className="tnum px-4 py-3.5 font-mono text-xs whitespace-nowrap text-grey">{p.openedAt.slice(0, 10)}</td>
                <td className="tnum px-4 py-3.5 text-right font-mono text-xs whitespace-nowrap text-grey">
                  {held(p.holdHours)}
                </td>
                <td className={`tnum px-4 py-3.5 text-right font-mono text-xs ${p.addsDown > 0 ? "text-white" : "text-grey-deep"}`}>
                  {p.addsDown || "—"}
                </td>
                <td className="tnum px-4 py-3.5 text-right font-mono text-xs whitespace-nowrap text-grey">
                  {p.avgEntry} → {p.exitPrice ?? "—"}
                </td>
                <td
                  className={`tnum py-3.5 pr-6 pl-4 text-right font-mono whitespace-nowrap ${
                    p.pnl === null ? "text-grey" : p.pnl > 0 ? "text-white" : "text-loss"
                  }`}
                >
                  {money(p.pnl)}
                  <span className="ml-2 text-xs opacity-60">{pct(p.pnlPct)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
