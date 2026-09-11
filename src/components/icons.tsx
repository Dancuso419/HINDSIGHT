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

export const Chevron = ({ open }: { open: boolean }) => (
  <svg {...base} className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
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

export const Checkbox = () => (
  <svg {...base} className="text-gold-deep">
    <path d="M2.5 2.5h11v11h-11z" />
  </svg>
);

export const Arrow = () => (
  <svg {...base}>
    <path d="M2.5 8h11M9.5 4l4 4-4 4" />
  </svg>
);
