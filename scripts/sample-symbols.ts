/**
 * The sample trader's universe: tokenized US stocks. Tech-adjacent names are where the
 * graded demo question points; the rest are the contrast group.
 */
export const SAMPLE_SYMBOLS = [
  { symbol: "NVDA", tech: true },
  { symbol: "TSLA", tech: true },
  { symbol: "AMD", tech: true },
  { symbol: "META", tech: true },
  { symbol: "PLTR", tech: true },
  { symbol: "COIN", tech: true },
  { symbol: "MSTR", tech: true },
  { symbol: "JPM", tech: false },
  { symbol: "KO", tech: false },
  { symbol: "XOM", tech: false },
  { symbol: "WMT", tech: false },
] as const;
