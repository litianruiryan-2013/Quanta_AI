import { useCallback, useEffect, useState } from "react";

const KEY = "quanta-learn-completed";

function read() {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return new Set();
  }
}

/** Client-only lesson-completion tracker — no backend, no auth required. */
export default function useLearnProgress() {
  const [completed, setCompleted] = useState(read);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify([...completed]));
  }, [completed]);

  const isComplete = useCallback((slug) => completed.has(slug), [completed]);

  const toggle = useCallback((slug) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const markComplete = useCallback((slug) => {
    setCompleted((prev) => (prev.has(slug) ? prev : new Set(prev).add(slug)));
  }, []);

  return { completed, isComplete, toggle, markComplete };
}
