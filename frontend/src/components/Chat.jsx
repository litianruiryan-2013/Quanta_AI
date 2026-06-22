import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BarChart3, Brain, Network, TrendingUp } from "lucide-react";
import Message from "./Message.jsx";
import QuantaLoader from "./QuantaLoader.jsx";
import { streamChat } from "../api.js";

const MODE_CONFIG = {
  strategy: {
    icon: Brain,
    label: "Strategy",
    description:
      "Ask for Business Model Canvases, SWOT matrices, or competitor teardowns. Load a ticker or spreadsheet to give the model real evidence.",
    suggestions: [
      "Build a Business Model Canvas for this idea",
      "Run a SWOT analysis on this data",
      "Do a competitor teardown",
    ],
    placeholder: "Ask for a canvas, SWOT, teardown, or market read… (Enter to send)",
  },
  supply_chain: {
    icon: Network,
    label: "Supply Chain Risk",
    description:
      "Upload a vendor CSV and commodity tickers → get a supplier risk matrix, concentration flags, and commodity exposure table.",
    suggestions: [
      "Map vendor exposure to commodity prices",
      "Build a supply disruption risk matrix",
      "Which suppliers have the highest concentration risk?",
    ],
    placeholder: "Ask about vendor risk, commodity exposure, or supply disruption…",
  },
  fx_treasury: {
    icon: TrendingUp,
    label: "FX Treasury",
    description:
      "Upload a cash-flow sheet and FX ticker data → find margin leak, rank currency exposures, and get hedge recommendations.",
    suggestions: [
      "Show the margin impact of USD/EUR moves",
      "Build an FX hedge recommendation table",
      "Rank our currency exposures by size",
    ],
    placeholder: "Ask about currency exposure, hedging strategies, or margin drag…",
  },
  commodity_arbitrage: {
    icon: BarChart3,
    label: "Commodity Arbitrage",
    description:
      "Upload regional price data and global benchmarks → find spread opportunities ranked by net margin.",
    suggestions: [
      "Find the widest spread opportunities",
      "Compare regional prices to global benchmarks",
      "Build an arbitrage signal table",
    ],
    placeholder: "Ask about price spreads, arbitrage windows, or regional anomalies…",
  },
};

const ease = [0.16, 1, 0.3, 1];

export default function Chat({
  model, models, onModelChange, ollamaOk,
  mode, onModeChange, dataContext, onClearDataContext,
  pendingPrompt, onPendingConsumed, messages, setMessages, provider,
}) {
  const [input, setInput]   = useState("");
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState(null);
  const abortRef  = useRef(null);
  const scrollRef = useRef(null);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = useCallback(
    async (textOverride) => {
      const text = (textOverride ?? input).trim();
      if (!text || busy) return;

      setError(null);
      if (!textOverride) setInput("");
      const history = [...messages, { role: "user", content: text }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat(
          { model, messages: history, attachedFiles: [], mode, dataContext: dataContext?.text || null },
          (delta) => {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, content: last.content + delta };
              return next;
            });
          },
          controller.signal
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
          setMessages((prev) =>
            prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev
          );
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [input, busy, messages, model, mode, dataContext]
  );

  useEffect(() => {
    if (pendingPrompt && !busy) {
      onPendingConsumed();
      send(pendingPrompt);
    }
  }, [pendingPrompt, busy, send, onPendingConsumed]);

  const stop  = () => abortRef.current?.abort();
  const clear = () => { stop(); setMessages([]); setError(null); };

  const cfg = MODE_CONFIG[mode] ?? MODE_CONFIG.strategy;
  const ModeIcon = cfg.icon;
  const msgTransition = shouldReduce ? { duration: 0 } : { duration: 0.3, ease };
  const badgeTransition = shouldReduce ? { duration: 0 } : { duration: 0.18 };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 px-4 py-2.5">
        {/* Mode badge — flips when module changes */}
        <AnimatePresence mode="wait">
          <motion.span
            key={mode}
            initial={shouldReduce ? false : { opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduce ? {} : { opacity: 0, y: 5 }}
            transition={badgeTransition}
            className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1 font-mono text-[11px] font-semibold text-ink-300"
          >
            <ModeIcon size={11} strokeWidth={2.5} />
            {cfg.label}
          </motion.span>
        </AnimatePresence>

        {/* Model picker */}
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="rounded-lg border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-xs text-ink-100 focus:border-ember-500 focus:outline-none"
        >
          {(models.length ? models : [model]).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <span className={`font-mono text-[11px] ${ollamaOk ? "text-mint-400" : "text-red-400"}`}>
          {ollamaOk
            ? `● ${provider === "groq" ? "Groq" : provider === "gemini" ? "Gemini" : "Ollama"} connected`
            : provider === "groq"
            ? "● Groq — set GROQ_API_KEY"
            : provider === "gemini"
            ? "● Gemini — set GEMINI_API_KEY"
            : "● Ollama offline"}
        </span>

        <button
          onClick={clear}
          className="ml-auto rounded px-2 py-1 text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-100"
        >
          Clear
        </button>
      </div>

      {/* Data context chip */}
      {dataContext && (
        <div className="flex flex-wrap gap-1.5 border-b border-ink-700 px-4 py-2">
          <motion.button
            onClick={onClearDataContext}
            title="Remove data evidence from context"
            whileHover={shouldReduce ? {} : { scale: 1.03 }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            className="group flex items-center gap-1 rounded-full border border-mint-400/40 bg-mint-400/10 px-2.5 py-0.5 font-mono text-[11px] text-mint-400 hover:border-red-400/50 hover:text-red-400"
          >
            {dataContext.label}
            <span className="text-ink-500 group-hover:text-red-400">✕</span>
          </motion.button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-12 text-center text-sm text-ink-500">
            <p className="mb-3">
              <ModeIcon size={28} className="mx-auto text-ink-700" strokeWidth={1.5} />
            </p>
            <p className="mb-1 font-semibold text-ink-300">{cfg.label}</p>
            <p className="mx-auto max-w-xs text-xs leading-relaxed">{cfg.description}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {cfg.suggestions.map((s) => (
                <motion.button
                  key={s}
                  onClick={() => setInput(s)}
                  whileHover={shouldReduce ? {} : { scale: 1.04 }}
                  whileTap={shouldReduce ? {} : { scale: 0.96 }}
                  className="rounded-full border border-ink-700 px-3 py-1 text-xs text-ink-300 hover:border-ember-500 hover:text-ember-500"
                >
                  {s}
                </motion.button>
              ))}
            </div>
            <p className="mt-6 font-mono text-[11px] text-ink-700">
              100% local · 100% free · nothing leaves your machine
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          const isWaiting =
            busy && i === messages.length - 1 && m.role === "assistant" && !m.content;
          return (
            <motion.div
              key={i}
              initial={shouldReduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={msgTransition}
            >
              {isWaiting ? (
                <div className="flex justify-start pl-1 pt-1">
                  <QuantaLoader size="sm" label="Thinking…" />
                </div>
              ) : (
                <Message
                  role={m.role}
                  content={m.content}
                  streaming={busy && i === messages.length - 1 && m.role === "assistant"}
                />
              )}
            </motion.div>
          );
        })}

        {error && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={msgTransition}
            className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-ink-700 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={2}
            placeholder={cfg.placeholder}
            className="min-h-[52px] flex-1 resize-y rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-100 placeholder-ink-500 focus:border-ember-500 focus:outline-none"
          />
          {busy ? (
            <motion.button
              onClick={stop}
              whileTap={shouldReduce ? {} : { scale: 0.95 }}
              className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-400/20"
            >
              Stop
            </motion.button>
          ) : (
            <motion.button
              onClick={() => send()}
              disabled={!input.trim()}
              whileHover={shouldReduce ? {} : { scale: 1.03 }}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
              className="rounded-lg bg-ember-600 px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-ember-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
