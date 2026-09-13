/** Drawn at a single 1.5px stroke on a 16-unit grid. */
const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** The Hindsight mark: a lens looking back — an arc turning on itself around a fixed point. */
export const Mark = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
    <path
      d="M26 16a10 10 0 1 1-3.2-7.3"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path d="M23.4 3.8 22.8 8.9l-5-0.9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="16" cy="16" r="3.2" fill="currentColor" />
  </svg>
);

export const Chevron = ({ open }: { open: boolean }) => (
  <svg {...base} className={`transition-transform duration-300 ${open ? "rotate-90" : ""}`}>
    <path d="M6 3.5 10.5 8 6 12.5" />
  </svg>
);

export const Upload = () => (
  <svg {...base}>
    <path d="M8 10.5V2.5M8 2.5 5 5.5M8 2.5l3 3M2.5 11v2.5h11V11" />
  </svg>
);

export const Sample = () => (
  <svg {...base}>
    <path d="M3 2.5h10v11H3zM5.5 6h5M5.5 8.5h5M5.5 11h3" />
  </svg>
);

export const Arrow = () => (
  <svg {...base}>
    <path d="M2.5 8h11M9.5 4l4 4-4 4" />
  </svg>
);

export const ArrowDown = () => (
  <svg {...base}>
    <path d="M8 2.5v11M4 9.5l4 4 4-4" />
  </svg>
);

export const Check = () => (
  <svg {...base}>
    <path d="M3 8.5 6.5 12 13 4.5" />
  </svg>
);

export const Lock = () => (
  <svg {...base}>
    <path d="M4 7.5h8v6H4zM5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2" />
  </svg>
);
