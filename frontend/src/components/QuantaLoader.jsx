import { useReducedMotion } from "framer-motion";

/**
 * Branded QUANTA loading indicator.
 * size="sm"  — Q mark + label in a row (chat inline use)
 * size="md"  — Q mark + QUANTA + label stacked (panels)
 * size="lg"  — larger stacked version (full-area overlays)
 */
export default function QuantaLoader({ label = "Loading…", size = "md" }) {
  const reduce = useReducedMotion();

  if (size === "sm") {
    return (
      <div role="status" aria-label={label} className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          {!reduce && (
            <div
              className="animate-glow-pulse absolute inset-0 rounded-lg bg-ember-500/50 blur-lg"
              aria-hidden="true"
            />
          )}
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-ember-600 font-mono text-xs font-bold text-ink-950">
            Q
          </div>
        </div>
        <span className="font-mono text-[11px] text-ink-500">{label}</span>
      </div>
    );
  }

  const markCls =
    size === "lg"
      ? "h-14 w-14 rounded-2xl text-lg"
      : "h-10 w-10 rounded-xl text-sm";

  return (
    <div role="status" aria-label={label} className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        {!reduce && (
          <div
            className="animate-glow-pulse absolute inset-0 rounded-xl bg-ember-500/50 blur-xl"
            aria-hidden="true"
          />
        )}
        <div
          className={`relative flex items-center justify-center bg-ember-600 font-mono font-bold text-ink-950 ${markCls}`}
        >
          Q
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-ink-300">
          QUANTA
        </span>
        <span className="font-mono text-[10px] text-ink-500">{label}</span>
      </div>
    </div>
  );
}
