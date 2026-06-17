// Thin client over the FastAPI backend.
//
// Locally, VITE_API_URL is unset → calls go to "/api/*" and Vite's dev proxy
// forwards them to the backend. In production (e.g. Vercel), set
// VITE_API_URL=https://your-backend.onrender.com and calls go straight there.
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const url = (path) => `${API_BASE}${path}`;

async function postJSON(path, body) {
  const res = await fetch(url(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function getHealth() {
  const res = await fetch(url("/api/health"));
  if (!res.ok) throw new Error("Backend unreachable");
  return res.json();
}

/** Historical OHLCV for one ticker (chart). */
export const fetchMarketData = (ticker, period = "6mo", interval = "1d") =>
  postJSON("/api/market-data", { ticker, period, interval });

/** Live-ish batch quotes for a portfolio. */
export const fetchQuotes = (tickers) => postJSON("/api/quotes", { tickers });

/** Upload a spreadsheet File for pandas profiling + preview. */
export async function analyzeSpreadsheet(file, name) {
  const form = new FormData();
  form.append("file", file, name || file.name);
  form.append("name", name || file.name);
  const res = await fetch(url("/api/analyze-csv"), { method: "POST", body: form });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.detail || `Analysis failed (${res.status})`);
  }
  return res.json();
}

/**
 * Stream a chat completion.
 * @param {object} params { model, messages, attachedFiles:[{name,content}], mode, dataContext }
 */
export async function streamChat(
  { model, messages, attachedFiles, mode, dataContext },
  onDelta,
  signal
) {
  const res = await fetch(url("/api/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      attached_files: attachedFiles || [],
      mode: mode || "code",
      data_context: dataContext || null,
    }),
    signal,
  });

  if (!res.ok || !res.body) throw new Error(`Chat request failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      let chunk;
      try {
        chunk = JSON.parse(line);
      } catch {
        continue;
      }
      if (chunk.error) throw new Error(chunk.error);
      if (chunk.delta) onDelta(chunk.delta);
      if (chunk.done) return;
    }
  }
}
