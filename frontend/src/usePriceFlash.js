import { useEffect, useRef, useState } from "react";

/**
 * Returns a className ("flash-up" | "flash-down" | "") that briefly tints
 * an element when `value` changes — the "number tick" cue on live prices.
 * No-ops on the first render (nothing "changed" yet).
 */
export default function usePriceFlash(value) {
  const prev = useRef(value);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (value == null) return;
    const previous = prev.current;
    prev.current = value;
    if (previous == null || value === previous) return;

    setFlash(value > previous ? "flash-up" : "flash-down");
    const t = setTimeout(() => setFlash(""), 900);
    return () => clearTimeout(t);
  }, [value]);

  return flash;
}
