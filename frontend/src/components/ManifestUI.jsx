// Small shared formatting helpers + primitives used across the app's new
// visual system (dark-by-default, ember accent, rounded/pill shapes).

export function fmtPrice(n, { digits = 2 } = {}) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Compact large numbers for stats — market cap, revenue, etc. */
export function fmtCompact(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  for (const [v, suffix] of units) {
    if (abs >= v) return `${(n / v).toFixed(2)}${suffix}`;
  }
  return n.toFixed(2);
}

export function fmtPct(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/** Move color: positive = up (green), negative = down (rose). Never ember. */
export function moveColorClass(n) {
  if (n == null) return "text-ink-500";
  if (n > 0) return "text-up";
  if (n < 0) return "text-down";
  return "text-ink-500";
}

export function Panel({ children, className = "", raised = false }) {
  return <div className={`${raised ? "card-raised" : "card"} ${className}`}>{children}</div>;
}

export function DashedDivider({ className = "" }) {
  return <div className={`border-t border-dashed border-line/12 ${className}`} />;
}

export function Label({ children, className = "" }) {
  return (
    <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 ${className}`}>
      {children}
    </span>
  );
}

/** Small change-amount pill — e.g. "+1.24%" in up/down color with a tinted background. */
export function ChangePill({ value, className = "" }) {
  const up = value > 0, down = value < 0;
  const tone = up ? "text-up bg-up/10" : down ? "text-down bg-down/10" : "text-ink-500 bg-line/5";
  return (
    <span className={`pill px-2.5 py-0.5 text-[11px] normal-case ${tone} ${className}`}>
      {up ? "▲" : down ? "▼" : "•"} {fmtPct(value)}
    </span>
  );
}
