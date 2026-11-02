import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import {
  sendAgentChat, createConversation, updateConversation, generateTitle,
  fetchQuotes, fetchSparkline,
} from "../api.js";
import AiMessage from "./AiMessage.jsx";
import PulseLine from "./PulseLine.jsx";
import { ChangePill, fmtPrice } from "./ManifestUI.jsx";
import usePriceFlash from "../usePriceFlash.js";

const BRIEFING_TICKERS = [
  { symbol: "^GSPC",    label: "S&P 500", digits: 2 },
  { symbol: "USDSGD=X", label: "USD/SGD", digits: 4 },
  { symbol: "GC=F",     label: "Gold",    digits: 2 },
  { symbol: "BTC-USD",  label: "BTC",     digits: 0 },
];

const SUGGESTIONS = [
  "What's the current price of AAPL?",
  "How has TSLA performed over the last 3 months?",
  "Why did the S&P 500 move today? Cite your sources.",
];

// Tickers the typed-message heuristic recognizes, beyond explicit $TICKER syntax.
const KNOWN_WORDS = {
  AAPL: "AAPL", NVDA: "NVDA", MSFT: "MSFT", TSLA: "TSLA", GOOGL: "GOOGL",
  AMZN: "AMZN", META: "META", BTC: "BTC-USD", ETH: "ETH-USD", GOLD: "GC=F",
};

function extractTickerHint(text) {
  const dollar = text.match(/\$([A-Za-z.\-=^]{1,10})/);
  if (dollar) return dollar[1].toUpperCase();
  const words = text.match(/\b[A-Z]{2,6}\b/g) || [];
  for (const w of words) if (KNOWN_WORDS[w]) return KNOWN_WORDS[w];
  return null;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function BriefingCard({ symbol, label, digits }) {
  const [quote, setQuote] = useState(null);
  const [spark, setSpark] = useState([]);
  const flash = usePriceFlash(quote?.price);

  useEffect(() => {
    let active = true;
    fetchQuotes([symbol]).then(({ quotes }) => { if (active) setQuote(quotes?.[symbol] || null); }).catch(() => {});
    fetchSparkline(symbol, "5d").then((s) => { if (active) setSpark(s); });
    return () => { active = false; };
  }, [symbol]);

  return (
    <div className="card p-3.5">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`mt-1 rounded px-1 font-mono text-base font-bold tabular-nums ${flash}`}>
        {quote ? fmtPrice(quote.price, { digits }) : "—"}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {quote ? <ChangePill value={quote.change_pct} /> : <span className="text-[11px] text-ink-700">—</span>}
      </div>
      {spark.length > 1 && <div className="mt-2"><PulseLine data={spark} width={110} height={24} glow={false} /></div>}
    </div>
  );
}

/** QUANTA AI chat — agent mode only, with conversation auto-save + a
 * "Today's briefing" empty state instead of a blank panel. */
export default function AiChatPanel({
  messages, setMessages, conversationId, onConversationSaved,
  pendingPrompt, onPendingConsumed,
}) {
  const { session } = useAuth();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const convIdRef = useRef(null);

  useEffect(() => { convIdRef.current = conversationId ?? null; }, [conversationId]);
  useEffect(() => { if (messages.length === 0) convIdRef.current = null; }, [messages.length]);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = useCallback(
    async (textOverride, tickerOverride) => {
      const text = (textOverride ?? input).trim();
      if (!text || busy) return;
      const ticker = tickerOverride ?? extractTickerHint(text);

      setError(null);
      if (!textOverride) setInput("");
      const history = [...messages, { role: "user", content: text }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await sendAgentChat({ messages: history }, controller.signal);
        const finalContent = result.content;

        let spark = null;
        if (ticker) spark = await fetchSparkline(ticker, "1mo");

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], content: finalContent, ticker, spark };
          return next;
        });

        const token = session?.access_token;
        if (token && finalContent) {
          const finalMessages = [...history, { role: "assistant", content: finalContent }];
          try {
            if (!convIdRef.current) {
              const title = text.slice(0, 120);
              const { id } = await createConversation({ title, messages: finalMessages, mode: "agent" }, token);
              convIdRef.current = id;
              onConversationSaved?.(id);
              generateTitle(text, finalContent)
                .then(({ title: aiTitle }) => {
                  if (aiTitle) {
                    updateConversation(id, { title: aiTitle }, token)
                      .then(() => onConversationSaved?.(id))
                      .catch(() => {});
                  }
                })
                .catch(() => {});
            } else {
              await updateConversation(convIdRef.current, { messages: finalMessages }, token);
            }
          } catch {
            // silent — auto-save never disrupts the chat
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
          setMessages((prev) => (prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev));
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [input, busy, messages, session?.access_token, onConversationSaved, setMessages]
  );

  useEffect(() => {
    if (pendingPrompt && !busy) {
      onPendingConsumed();
      send(pendingPrompt.text, pendingPrompt.ticker);
    }
  }, [pendingPrompt, busy, send, onPendingConsumed]);

  const stop = () => abortRef.current?.abort();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const composer = (
    <div className="border-t border-line/8 p-4">
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          rows={1}
          placeholder="Ask about live prices, market history, or why something moved… (Enter to send)"
          className="focus-glow flex-1 resize-none rounded-xl border border-line/10 bg-ink-900 px-4 py-3 font-sans text-sm text-ink-100 outline-none placeholder:text-ink-700 disabled:opacity-60"
        />
        {busy ? (
          <button onClick={stop} className="pill-outline shrink-0">Stop</button>
        ) : (
          <button onClick={() => send()} disabled={!input.trim()} className="pill-ember focus-glow shrink-0">
            Send
          </button>
        )}
      </div>
    </div>
  );

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="fade-rise mx-auto max-w-2xl">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ember-600">Today's briefing</p>
            <h1 className="mt-1 font-display text-3xl font-bold">{greeting()}. Here's what's moving.</h1>
            <p className="mt-2 font-sans text-sm text-ink-500">
              Ask about live prices, market history, or why something moved — QUANTA AI has
              tool access to real-time data and the web.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BRIEFING_TICKERS.map((t) => <BriefingCard key={t.symbol} {...t} />)}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="pill-chip">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        {composer}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((m, i) => (
          <AiMessage
            key={i}
            role={m.role}
            content={m.content || (busy && i === messages.length - 1 ? "…" : "")}
            spark={m.spark}
            sparkVariant={m.spark ? "auto" : undefined}
          />
        ))}

        {error && (
          <div className="card border-down/30 px-3 py-2 font-mono text-xs text-down">
            {error}
          </div>
        )}
      </div>
      {composer}
    </div>
  );
}
