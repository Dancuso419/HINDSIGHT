"use client";

import { useState } from "react";
import { reviewToCsv, rowTimestamp, type ReviewRow } from "@/lib/extract";
import { Upload, Sample, Clipboard, ImageIcon } from "./icons";

type Mode = "none" | "paste" | "screenshots";

const MAX_IMAGES = 4;
const MAX_BYTES = 1_350_000;

/**
 * Downscale a screenshot in the browser so it fits the upload limit while its text stays readable.
 * Width is what text legibility depends on, so a tall scrolling capture keeps its width and is only
 * shortened if it is extreme.
 */
async function prepareImage(file: File): Promise<{ data: string; mime_type: string }> {
  const toBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // e.g. HEIC in a browser that cannot decode it — send as-is if it is small enough.
    if (file.size <= MAX_BYTES && file.type) return { data: await toBase64(file), mime_type: file.type };
    throw new Error(`${file.name} could not be opened. Save it as PNG or JPEG and try again.`);
  }

  const scale = Math.min(1, 1600 / bitmap.width, 6000 / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.92, 0.82, 0.7]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_BYTES) return { data: await toBase64(blob), mime_type: "image/jpeg" };
  }
  throw new Error(`${file.name} is too large to read even after compressing it. Crop it to the order list.`);
}

const cellInput =
  "w-full min-w-0 rounded-md border border-line bg-black/40 px-2 py-1.5 font-mono text-xs text-white focus:border-white/50 focus:outline-none";

export function ImportTrades({
  hasResult,
  summary,
  onLoad,
  onSample,
}: {
  hasResult: boolean;
  summary: string | null;
  onLoad: (csv: string, name: string) => void;
  onSample: () => void;
}) {
  const [mode, setMode] = useState<Mode>("none");
  const [pasted, setPasted] = useState("");
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [year, setYear] = useState("");

  const toggle = (next: Mode) => {
    setMode((m) => (m === next ? "none" : next));
    setError(null);
  };

  const readScreenshots = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setRows(null);
    if (files.length > MAX_IMAGES) return setError(`Up to ${MAX_IMAGES} screenshots at a time.`);
    setReading(true);
    try {
      const images = await Promise.all([...files].map(prepareImage));
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "The screenshots could not be read.");
      else {
        setRows(data.rows);
        setNotes(data.notes ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The screenshots could not be read.");
    } finally {
      setReading(false);
    }
  };

  const update = (i: number, patch: Partial<ReviewRow>) =>
    setRows((rs) => rs && rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const included = rows?.filter((r) => r.include) ?? [];
  const needsYear = included.some((r) => rowTimestamp(r, "") === null);
  const { unresolved } = rows ? reviewToCsv(rows, year) : { unresolved: 0 };

  return (
    <>
      <div className="relative flex flex-wrap items-center gap-3">
        <label className="btn-pill cursor-pointer">
          <Upload />
          {hasResult ? "Load a different CSV" : "Upload your CSV"}
          <input
            type="file"
            accept=".csv,text/csv,.tsv,.txt"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                setMode("none");
                onLoad(await file.text(), file.name);
              }
            }}
          />
        </label>
        <button onClick={() => toggle("paste")} aria-expanded={mode === "paste"} className="btn-ghost">
          <Clipboard />
          Paste trades
        </button>
        <button onClick={() => toggle("screenshots")} aria-expanded={mode === "screenshots"} className="btn-ghost">
          <ImageIcon />
          Read screenshots
        </button>
        <button
          onClick={() => {
            setMode("none");
            onSample();
          }}
          className="btn-ghost"
        >
          <Sample />
          Use the sample history
        </button>
        {summary && <span className="tnum ml-auto font-mono text-xs text-grey">{summary}</span>}
      </div>

      {mode === "paste" && (
        <div className="relative mt-6 rounded-2xl border border-line bg-black/30 p-5">
          <label htmlFor="paste" className="text-sm text-white">
            Paste your order history
          </label>
          <p className="mt-1 text-xs leading-relaxed text-grey">
            Select the table on your exchange&apos;s order history page, or in Excel or Google Sheets, copy it, and paste it
            here with its header row. It needs a time, symbol, side, quantity and price for each fill.
          </p>
          <textarea
            id="paste"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={7}
            spellCheck={false}
            placeholder={"Time\tPair\tSide\tPrice\tAmount\tFee\n2026-09-11 14:32:10\tNVDA/USDT\tBuy\t218.29\t2.5\t0.33"}
            className="mt-4 w-full rounded-xl border border-line-strong bg-black/50 p-3 font-mono text-xs text-white placeholder:text-grey-deep focus:border-white/50 focus:outline-none"
          />
          <button
            onClick={() => {
              onLoad(pasted, "pasted trades");
              setMode("none");
            }}
            disabled={!pasted.trim()}
            className="btn-pill mt-4"
          >
            Read pasted trades
          </button>
        </div>
      )}

      {mode === "screenshots" && (
        <div className="relative mt-6 rounded-2xl border border-line bg-black/30 p-5">
          <p className="text-sm text-white">Read trades from screenshots of your order history</p>
          <p className="mt-1 max-w-[72ch] text-xs leading-relaxed text-grey">
            Works with any app that shows your filled orders. Take up to {MAX_IMAGES} screenshots of the list. The images are
            sent to Google Gemini to read the trades and are not stored. You check and correct every row before anything is
            analysed.
          </p>

          <label className={`btn-ghost mt-4 cursor-pointer ${reading ? "pointer-events-none opacity-50" : ""}`}>
            <ImageIcon />
            {reading ? "Reading your screenshots…" : rows ? "Choose different screenshots" : "Choose screenshots"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
              multiple
              className="sr-only"
              onChange={(e) => readScreenshots(e.target.files)}
            />
          </label>

          {error && <p className="mt-4 text-sm text-loss">{error}</p>}

          {rows && (
            <div className="mt-6">
              <p className="text-sm text-white">
                Found {rows.length} order{rows.length === 1 ? "" : "s"}. Check each one against your screenshot.
              </p>
              {notes.length > 0 && <p className="mt-1 text-xs text-grey">{notes.join(" ")}</p>}

              {needsYear && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/20 bg-white/[0.04] p-3">
                  <label htmlFor="year" className="text-xs text-white">
                    Your screenshots don&apos;t show the year. Which year were these trades?
                  </label>
                  <input
                    id="year"
                    inputMode="numeric"
                    maxLength={4}
                    value={year}
                    onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                    placeholder="YYYY"
                    className={`${cellInput} !w-24`}
                  />
                </div>
              )}

              <div className="mt-4 overflow-x-auto" data-lenis-prevent-horizontal>
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-[11px] text-grey">
                      {["Use", "Date", "Time", "Symbol", "Side", "Qty", "Price", "Fee", "Status"].map((h) => (
                        <th key={h} className="px-1.5 py-2 font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={`border-b border-line align-top ${r.include ? "" : "opacity-45"}`}>
                        <td className="px-1.5 py-2">
                          <input
                            type="checkbox"
                            checked={r.include}
                            onChange={(e) => update(i, { include: e.target.checked })}
                            aria-label={`Use order ${i + 1}`}
                            className="mt-1.5 accent-white"
                          />
                        </td>
                        <td className="w-28 px-1.5 py-2">
                          <input className={cellInput} value={r.date} onChange={(e) => update(i, { date: e.target.value })} />
                        </td>
                        <td className="w-24 px-1.5 py-2">
                          <input className={cellInput} value={r.time} onChange={(e) => update(i, { time: e.target.value })} />
                        </td>
                        <td className="w-28 px-1.5 py-2">
                          <input className={cellInput} value={r.symbol} onChange={(e) => update(i, { symbol: e.target.value })} />
                        </td>
                        <td className="w-24 px-1.5 py-2">
                          <select
                            className={cellInput}
                            value={r.side}
                            onChange={(e) => update(i, { side: e.target.value as ReviewRow["side"] })}
                          >
                            <option value="buy">buy</option>
                            <option value="sell">sell</option>
                            <option value="unknown">?</option>
                          </select>
                        </td>
                        <td className="px-1.5 py-2">
                          <input className={cellInput} value={r.qty} onChange={(e) => update(i, { qty: e.target.value })} />
                        </td>
                        <td className="px-1.5 py-2">
                          <input className={cellInput} value={r.price} onChange={(e) => update(i, { price: e.target.value })} />
                        </td>
                        <td className="px-1.5 py-2">
                          <input className={cellInput} value={r.fee} onChange={(e) => update(i, { fee: e.target.value })} />
                        </td>
                        <td className="px-1.5 py-2 font-mono text-[11px] text-grey">
                          {r.status || "—"}
                          {r.issues.length > 0 && (
                            <span className="mt-1 block max-w-[14rem] font-sans text-[11px] leading-snug text-loss">
                              {r.issues.join("; ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  className="btn-pill"
                  disabled={included.length === 0 || unresolved > 0}
                  onClick={() => {
                    onLoad(reviewToCsv(rows, year).csv, "screenshot import");
                    setMode("none");
                  }}
                >
                  Use these {included.length} trade{included.length === 1 ? "" : "s"}
                </button>
                {unresolved > 0 && (
                  <span className="text-xs text-grey">
                    {unresolved} row{unresolved === 1 ? " needs" : "s need"} a year or a readable date first.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
