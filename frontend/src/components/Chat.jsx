import { useCallback, useEffect, useRef, useState } from "react";
import Message from "./Message.jsx";
import { streamChat } from "../api.js";

const STRATEGY_SUGGESTIONS = [
  "Build a Business Model Canvas for this idea",
  "Run a SWOT analysis on this data",
  "Do a competitor teardown",
];

/**
 * Right panel: streaming chat with the local Ollama model.
 *  - Mode toggle: Code (engineer persona) vs Strategy (consultant persona).
 *  - dataContext: market series / dataset profile injected as evidence.
 *  - pendingPrompt: auto-sent message queued by "Analyze with AI".
 */
export default function Chat({
  model, models, onModelChange, attached, onDetach, ollamaOk,
  mode, onModeChange, dataContext, onClearDataContext,
  pendingPrompt, onPendingConsumed, messages, setMessages, provider,
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);

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

      // Read attached file contents from their browser File handles.
      const attachedFiles = [];
      for (const node of attached.values()) {
        try {
          let content = await node.file.text();
          if (content.length > 200000) content = content.slice(0, 200000);
          attachedFiles.push({ name: node.path, content });
        } catch {
          // Skip files that can't be read as text.
        }
      }

      try {
        await streamChat(
          {
            model,
            messages: history,
            attachedFiles,
            mode,
            dataContext: dataContext?.text || null,
          },
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
    [input, busy, messages, model, attached, mode, dataContext]
  );

  // "Analyze with AI" queues a prompt — fire it as soon as we're idle.
  useEffect(() => {
    if (pendingPrompt && !busy) {
      onPendingConsumed();
      send(pendingPrompt);
    }
  }, [pendingPrompt, busy, send, onPendingConsumed]);

  const stop = () => abortRef.current?.abort();
  const clear = () => {
    stop();
    setMessages([]);
    setError(null);
  };

  const strategy = mode === "strategy";

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 px-4 py-2.5">
        {/* Mode toggle */}
        <div className="flex overflow-hidden rounded-lg border border-ink-700">
          <button
            onClick={() => onModeChange("code")}
            className={`px-3 py-1 text-xs font-semibold transition-colors ${
              !strategy ? "bg-ember-600 text-ink-950" : "text-ink-300 hover:bg-ink-800"
            }`}
          >
            ⌘ Code
          </button>
          <button
            onClick={() => onModeChange("strategy")}
            className={`px-3 py-1 text-xs font-semibold transition-colors ${
              strategy ? "bg-ember-600 text-ink-950" : "text-ink-300 hover:bg-ink-800"
            }`}
          >
            ♟ Strategy
          </button>
        </div>

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
            ? "● Groq — set GROQ_API_KEY on the server"
            : provider === "gemini"
            ? "● Gemini — set GEMINI_API_KEY on the server"
            : "● Ollama offline — run `ollama serve`"}
        </span>

        <button
          onClick={clear}
          className="ml-auto rounded px-2 py-1 text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-100"
        >
          Clear chat
        </button>
      </div>

      {/* Context chips: attached code files + data evidence */}
      {(attached.size > 0 || dataContext) && (
        <div className="flex flex-wrap gap-1.5 border-b border-ink-700 px-4 py-2">
          {dataContext && (
            <button
              onClick={onClearDataContext}
              title="Remove data evidence from context"
              className="group flex items-center gap-1 rounded-full border border-mint-400/40 bg-mint-400/10 px-2.5 py-0.5 font-mono text-[11px] text-mint-400 hover:border-red-400/50 hover:text-red-400"
            >
              {dataContext.label}
              <span className="text-ink-500 group-hover:text-red-400">✕</span>
            </button>
          )}
          {[...attached.keys()].map((p) => (
            <button
              key={p}
              onClick={() => onDetach(p)}
              title="Remove from context"
              className="group flex items-center gap-1 rounded-full border border-ember-600/40 bg-ember-600/10 px-2.5 py-0.5 font-mono text-[11px] text-ember-500 hover:border-red-400/50 hover:text-red-400"
            >
              {p}
              <span className="text-ink-500 group-hover:text-red-400">✕</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-12 text-center text-sm text-ink-500">
            <p className="mb-2 text-2xl">{strategy ? "♟" : "⌘"}</p>
            {strategy ? (
              <>
                <p>
                  Strategy Mode is on — ask for Business Model Canvases, SWOT
                  matrices, or competitor teardowns.
                  <br />
                  Load a ticker or open a spreadsheet to give the model real evidence.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {STRATEGY_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-full border border-ink-700 px-3 py-1 text-xs text-ink-300 hover:border-ember-500 hover:text-ember-500"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p>
                Scan a folder on the left, click files to attach them as context,
                <br />
                then ask anything — “explain this file”, “find the bug”, “add tests”.
              </p>
            )}
            <p className="mt-4 font-mono text-[11px] text-ink-700">
              100% local · 100% free · nothing leaves your machine
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <Message
            key={i}
            role={m.role}
            content={m.content}
            streaming={busy && i === messages.length - 1 && m.role === "assistant"}
          />
        ))}
        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-ink-700 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={
              strategy
                ? "Ask for a canvas, SWOT, teardown, or market read… (Enter to send)"
                : "Ask a coding question… (Enter to send, Shift+Enter for newline)"
            }
            className="min-h-[52px] flex-1 resize-y rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-100 placeholder-ink-500 focus:border-ember-500 focus:outline-none"
          />
          {busy ? (
            <button
              onClick={stop}
              className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-400/20"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => send()}
              disabled={!input.trim()}
              className="rounded-lg bg-ember-600 px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-ember-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
