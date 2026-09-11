"use client";

import { useEffect, useRef, useState } from "react";
import type { Position, Trade } from "@/lib/trades";
import { Chevron } from "./icons";

const money = (n: number | null) =>
  n === null ? "—" : `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-rule">
            {["", "Position", "Symbol", "Opened", "Held", "Adds", "Entry → Exit", "P&L"].map((h, i) => (
              <th
                key={i}
                className={`label py-3 font-normal ${i === 0 ? "w-8 pl-0" : "px-4"} ${i >= 4 ? "text-right" : "text-left"}`}
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
                className={`border-b border-rule align-top transition-colors duration-200 ${
                  isProof ? "bg-gold/[0.07]" : ""
                }`}
              >
                <td className="py-3 pl-0">
                  <button
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "Hide" : "Show"} the fills behind ${p.id}`}
                    className="text-bone-dim transition-colors hover:text-gold"
                  >
                    <Chevron open={isOpen} />
                  </button>
                </td>

                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    {/* Proof is marked three ways: a rule, a weight, and a colour. */}
                    <span
                      aria-hidden
                      className={`block h-3.5 w-0.5 ${isProof ? "bg-gold" : "bg-transparent"}`}
                    />
                    <span className={`font-mono text-xs ${isProof ? "font-semibold text-gold" : "text-bone-dim"}`}>
                      {p.id}
                    </span>
                    {isProof && <span className="sr-only">cited as proof</span>}
                  </span>

                  {isOpen && (
                    <ul className="mt-3 space-y-1.5 border-l border-rule-gold pl-3 font-mono text-xs text-bone-dim">
                      {fills.map((f) => (
                        <li key={f.id} className="tnum whitespace-nowrap">
                          <span className="text-gold-deep">{f.id}</span>{" "}
                          {f.timestamp.slice(0, 16).replace("T", " ")}{" "}
                          <span className={f.side === "buy" ? "text-sage" : "text-clay"}>
                            {f.side.padEnd(4, " ")}
                          </span>{" "}
                          {f.qty} @ {f.price}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>

                <td className="px-4 py-3 font-medium text-bone">{p.symbol}</td>
                <td className="tnum px-4 py-3 font-mono text-xs whitespace-nowrap text-bone-dim">
                  {p.openedAt.slice(0, 10)}
                </td>
                <td className="tnum px-4 py-3 text-right font-mono text-xs whitespace-nowrap text-bone-dim">
                  {held(p.holdHours)}
                </td>
                <td
                  className={`tnum px-4 py-3 text-right font-mono text-xs ${
                    p.addsDown > 0 ? "text-gold" : "text-bone-dim/50"
                  }`}
                >
                  {p.addsDown || "—"}
                </td>
                <td className="tnum px-4 py-3 text-right font-mono text-xs whitespace-nowrap text-bone-dim">
                  {p.avgEntry} <span className="text-gold-deep">→</span> {p.exitPrice ?? "—"}
                </td>
                <td
                  className={`tnum px-4 py-3 text-right font-mono whitespace-nowrap ${
                    p.pnl === null ? "text-bone-dim" : p.pnl > 0 ? "text-sage" : "text-clay"
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
