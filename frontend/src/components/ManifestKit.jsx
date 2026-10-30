// Shared visual primitives for QUANTA Business — the "shipping manifest"
// skin used by DashboardPage and PayablesPage. Deliberately separate from
// the ink/ember theme: fixed palette, square corners, 1.5px ink borders.

export const CCY_DECIMALS = { JPY: 0 };

export function fmtSGD(n, { signed = false } = {}) {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const body = `S$${abs.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n < 0) return `-${body}`;
  return signed ? `+${body}` : body;
}

export function fmtAmount(n, ccy) {
  if (n == null || Number.isNaN(n)) return "—";
  const decimals = CCY_DECIMALS[ccy] ?? 2;
  return n.toLocaleString("en-SG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtRate(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-SG", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-SG", { year: "numeric", month: "short", day: "2-digit" });
}

/** Impact color: positive (costing more) = rust, negative (in your favour) = forest. */
export function impactColorClass(n) {
  if (n == null) return "text-manifest-muted";
  if (n > 0) return "text-manifest-rust";
  if (n < 0) return "text-manifest-forest";
  return "text-manifest-muted";
}

export function Panel({ children, className = "" }) {
  return (
    <div className={`border-[1.5px] border-manifest-ink bg-manifest-panel ${className}`}>
      {children}
    </div>
  );
}

export function DashedDivider({ className = "" }) {
  return <div className={`border-t-[1.5px] border-dashed border-manifest-dash ${className}`} />;
}

export function Label({ children, className = "" }) {
  return (
    <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-manifest-muted ${className}`}>
      {children}
    </span>
  );
}

/** Invoice reference shown as a boxed monospace tag, e.g. PO-24091. */
export function RefTag({ children, className = "" }) {
  return (
    <span
      className={`inline-block border-[1.5px] border-manifest-ink bg-manifest-bg px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-manifest-ink ${className}`}
    >
      {children}
    </span>
  );
}

const STAMP_STYLE = {
  pending:  { label: "AWAITING",  color: "border-manifest-ink text-manifest-ink",       rotate: "-rotate-2" },
  paid:     { label: "SETTLED",   color: "border-manifest-forest text-manifest-forest", rotate: "rotate-1"  },
  overdue:  { label: "OVERDUE",   color: "border-manifest-rust text-manifest-rust",      rotate: "-rotate-1" },
};

/** Status badge styled like a rubber ink stamp: bold double border, slight rotation, uppercase. */
export function StatusStamp({ status, className = "" }) {
  const s = STAMP_STYLE[status] || STAMP_STYLE.pending;
  return (
    <span
      className={`inline-block select-none border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${s.color} ${s.rotate} ${className}`}
      style={{ boxShadow: `inset 0 0 0 2px currentColor`, opacity: 0.88 }}
    >
      {s.label}
    </span>
  );
}
