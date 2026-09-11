"use client";

import { useEffect, useRef, useState } from "react";
import type { Position, Trade } from "@/lib/trades";

const money = (n: number | null) =>
  n === null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "open");
const hold = (h: number | null) => (h === null ? "—" : h < 24 ? `${h.toFixed(0)}h` : `${(h / 24).toFixed(1)}d`);

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

  // Clicking a claim's evidence opens the position it rests on — adjusted during render,
  // so a later manual toggle still wins.
  if (focused !== lastFocused) {
    setLastFocused(focused);
    setExpanded(focused);
  }

  // ...and brings it into view.
  useEffect(() => {
    if (focused) rows.current.get(focused)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focused]);

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
      <table className="w-full text-sm">
        <thead className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-black/50 dark:border-white/15 dark:text-white/50">
          <tr>
            {["", "Position", "Symbol", "Opened", "Held", "Adds", "Entry → Exit", "P&L"].map((h, i) => (
              <th key={i} className="px-3 py-2 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const isEvidence = selected.has(p.id);
            const isOpen = expanded === p.id;
            const fills = trades.filter((t) => p.tradeIds.includes(t.id));
            return (
              <tr
                key={p.id}
                ref={(el) => {
                  if (el) rows.current.set(p.id, el);
                }}
                className={`border-b border-black/5 align-top last:border-0 dark:border-white/10 ${
                  isEvidence ? "bg-amber-400/10" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <button
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "Hide" : "Show"} the fills behind ${p.id}`}
                    className="text-black/40 hover:text-foreground dark:text-white/40"
                  >
                    {isOpen ? "▾" : "▸"}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`font-mono text-xs ${isEvidence ? "font-semibold text-amber-700 dark:text-amber-400" : "text-black/50 dark:text-white/50"}`}
                  >
                    {p.id}
                  </span>
                  {isOpen && (
                    <ul className="mt-2 space-y-1 font-mono text-xs text-black/60 dark:text-white/60">
                      {fills.map((f) => (
                        <li key={f.id} className="whitespace-nowrap">
                          <span className="text-black/40 dark:text-white/40">{f.id}</span>{" "}
                          {f.timestamp.slice(0, 16).replace("T", " ")}{" "}
                          <span className={f.side === "buy" ? "text-emerald-600" : "text-red-600"}>{f.side}</span>{" "}
                          {f.qty} @ {f.price}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-2 font-medium">{p.symbol}</td>
                <td className="px-3 py-2 whitespace-nowrap">{day(p.openedAt)}</td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">{hold(p.holdHours)}</td>
                <td className={`px-3 py-2 tabular-nums ${p.addsDown > 0 ? "font-medium text-amber-700 dark:text-amber-400" : "text-black/40 dark:text-white/40"}`}>
                  {p.addsDown || "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums text-black/60 dark:text-white/60">
                  {p.avgEntry} → {p.exitPrice ?? "—"}
                </td>
                <td
                  className={`px-3 py-2 whitespace-nowrap tabular-nums ${
                    p.pnl === null ? "" : p.pnl > 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {money(p.pnl)} <span className="text-xs opacity-70">{pct(p.pnlPct)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
