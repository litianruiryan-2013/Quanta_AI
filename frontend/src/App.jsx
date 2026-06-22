import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Home from "./Home.jsx";
import DataPanel from "./components/FileTree.jsx";
import Chat from "./components/Chat.jsx";
import MarketDashboard from "./components/MarketDashboard.jsx";
import DataPreview from "./components/DataPreview.jsx";
import Simulator from "./components/Simulator.jsx";
import useMediaQuery from "./useMediaQuery.js";
import { getHealth, analyzeSpreadsheet } from "./api.js";

export default function App() {
  // Ollama
  const [ollamaOk, setOllamaOk] = useState(false);
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("llama3");
  const [provider, setProvider] = useState("ollama");

  // Chat (messages lifted here so they survive workspace/tab switches)
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("strategy");
  const [dataContext, setDataContext] = useState(null);
  const [pendingPrompt, setPendingPrompt] = useState(null);
  const [preview, setPreview] = useState(null);

  // Layout
  const [showHome, setShowHome] = useState(true);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [workspace, setWorkspace] = useState("assistant"); // desktop: assistant | trading
  const [showMarket, setShowMarket] = useState(false);
  const [mobileTab, setMobileTab] = useState("chat");       // files|market|trade|chat

  // Theme
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("quanta-theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("quanta-theme", theme);
  }, [theme]);
  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  // Unified module selector: one of the 4 analysis modes OR "simulator".
  const setModule = useCallback((m) => {
    if (m === "simulator") {
      setWorkspace("trading");
    } else {
      setWorkspace("assistant");
      setMode(m);
    }
  }, []);

  const shouldReduce = useReducedMotion();

  // Health polling
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const h = await getHealth();
        if (!active) return;
        setProvider(h.provider || "ollama");
        setOllamaOk(h.ready ?? h.ollama);
        setModels(h.models || []);
        if (h.models?.length) {
          setModel((current) => {
            if (h.models.includes(current)) return current;
            const preferred = h.models.find(
              (m) => m.startsWith("llama-") || m.startsWith("gemini") || m.startsWith("llama3") || m.startsWith("mistral")
            );
            return preferred || h.models[0];
          });
        }
      } catch {
        if (active) setOllamaOk(false);
      }
    };
    check();
    const id = setInterval(check, 10000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const openData = useCallback(async (node) => {
    setPreview({ loading: true, error: null, data: null });
    try {
      const data = await analyzeSpreadsheet(node.file, node.path);
      setPreview({ loading: false, error: null, data });
    } catch (err) {
      setPreview({ loading: false, error: err.message, data: null });
    }
  }, []);

  // Route any evidence (dataset, market, portfolio) into the Strategy chat.
  const sendEvidenceToAI = useCallback(
    (ctx, prompt) => {
      setDataContext(ctx);
      if (prompt) setPendingPrompt(prompt);
      setWorkspace("assistant");
      if (isMobile) setMobileTab("chat");
    },
    [isMobile]
  );

  const analyzeWithAI = useCallback(
    (data) => {
      setPreview(null);
      sendEvidenceToAI(
        { label: `📊 ${data.path}`, text: data.ai_summary },
        `Analyze the dataset ${data.path}. Summarize what it contains, surface the most ` +
          `important trends, outliers and correlations you can infer from the profile, and ` +
          `recommend 3 business actions supported by the numbers.`
      );
    },
    [sendEvidenceToAI]
  );

  if (showHome) {
    return <Home onLaunch={() => setShowHome(false)} theme={theme} onToggleTheme={toggleTheme} />;
  }

  const trading       = workspace === "trading";
  const currentModule = trading ? "simulator" : mode;
  const providerLabel = provider === "groq" ? "Groq" : provider === "gemini" ? "Gemini" : "Ollama";

  // ---- Shared panels ----
  const activeFile = dataContext ? dataContext.label.replace(/^📊\s*/, "") : null;
  const dataPanel = <DataPanel onOpenData={openData} activeFile={activeFile} />;
  const marketPanel = <MarketDashboard onSendToAI={sendEvidenceToAI} theme={theme} />;
  const simulatorPanel = <Simulator onSendToAI={sendEvidenceToAI} theme={theme} />;
  const chatPanel = (
    <Chat
      model={model} models={models} onModelChange={setModel}
      ollamaOk={ollamaOk} provider={provider}
      mode={mode} onModeChange={setMode}
      dataContext={dataContext} onClearDataContext={() => setDataContext(null)}
      pendingPrompt={pendingPrompt} onPendingConsumed={() => setPendingPrompt(null)}
      messages={messages} setMessages={setMessages}
    />
  );
  const dataPreviewOverlay = preview && (
    <DataPreview data={preview.data} loading={preview.loading} error={preview.error}
      onClose={() => setPreview(null)} onAnalyze={analyzeWithAI} />
  );

  // ============================ MOBILE ============================
  if (isMobile) {
    const TABS = [
      { id: "files",  label: "Data",   icon: "📂" },
      { id: "market", label: "Chart",  icon: "▲"  },
      { id: "trade",  label: "Trade",  icon: "💹" },
      { id: "chat",   label: "Chat",   icon: "💬" },
    ];
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-2 border-b border-ink-700 bg-ink-900 px-3 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ember-600 font-mono text-xs font-bold text-ink-950">
            Q
          </div>
          <select
            value={currentModule}
            onChange={(e) => setModule(e.target.value)}
            className="min-w-0 flex-1 rounded border border-ink-700 bg-ink-900 py-0.5 font-mono text-xs text-ink-100 focus:border-ember-500 focus:outline-none"
          >
            <option value="strategy">♟ Strategy</option>
            <option value="supply_chain">🌐 Supply Chain</option>
            <option value="fx_treasury">📈 FX Treasury</option>
            <option value="commodity_arbitrage">💎 Commodity Arb</option>
            <option value="simulator">💹 Paper Trading</option>
          </select>
          <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${ollamaOk ? "bg-mint-400" : "bg-red-400"}`} />
          <button onClick={toggleTheme} aria-label="Toggle theme"
            className="shrink-0 rounded-lg border border-ink-700 px-2 py-1 text-xs text-ink-300">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </header>

        <main className="relative min-h-0 flex-1">
          <div className={`h-full ${mobileTab === "files"  ? "" : "hidden"}`}>{dataPanel}</div>
          <div className={`h-full overflow-y-auto ${mobileTab === "market" ? "" : "hidden"}`}>{marketPanel}</div>
          <div className={`h-full ${mobileTab === "trade"  ? "" : "hidden"}`}>{simulatorPanel}</div>
          <div className={`h-full ${mobileTab === "chat"   ? "" : "hidden"}`}>{chatPanel}</div>
          {dataPreviewOverlay}
        </main>

        <nav className="flex border-t border-ink-700 bg-ink-900">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setMobileTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                mobileTab === t.id ? "text-ember-500" : "text-ink-500"}`}>
              <span className="text-sm leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  // ============================ DESKTOP ============================
  return (
    <div className="flex h-full flex-col">
      {/* ── Top bar ── */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-ink-700 bg-ink-900 px-5">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ember-600 font-mono text-sm font-bold text-ink-950">
            Q
          </div>
          <span className="font-mono text-sm font-bold tracking-[0.15em] text-ink-100">QUANTA</span>
        </div>

        <div className="h-5 w-px shrink-0 bg-ink-700" />

        {/* Module dropdown — the primary nav */}
        <select
          value={currentModule}
          onChange={(e) => setModule(e.target.value)}
          className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 font-mono text-xs font-semibold text-ink-100 transition-colors hover:border-ink-500 focus:border-ember-500 focus:outline-none"
        >
          <option value="strategy">♟  Strategy</option>
          <option value="supply_chain">🌐  Supply Chain Risk</option>
          <option value="fx_treasury">📈  FX Treasury</option>
          <option value="commodity_arbitrage">💎  Commodity Arbitrage</option>
          <option value="simulator">💹  Paper Trading</option>
        </select>

        <div className="flex-1" />

        {/* Chart toggle — hidden in simulator */}
        {!trading && (
          <button
            onClick={() => setShowMarket((s) => !s)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
              showMarket
                ? "border-ember-500/60 bg-ember-600/15 text-ember-500"
                : "border-ink-700 text-ink-500 hover:border-ink-500 hover:text-ink-100"
            }`}
          >
            <span className="text-[10px]">▲</span> Chart
          </button>
        )}

        {/* AI provider status */}
        <span className={`flex items-center gap-1.5 font-mono text-[11px] ${ollamaOk ? "text-mint-400" : "text-red-400"}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${ollamaOk ? "bg-mint-400" : "bg-red-400"}`} />
          {providerLabel}
        </span>

        {/* Offline badge */}
        <span className="rounded-full border border-ink-700 px-2 py-0.5 font-mono text-[10px] text-ink-500">
          offline · free
        </span>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="rounded-lg border border-ink-700 px-2.5 py-1.5 font-mono text-[11px] text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>

      {/* ── Body ── */}
      <main className="flex min-h-0 flex-1">
        {/* Left: data panel — slides away when simulator is active */}
        <motion.aside
          animate={{ width: trading ? 0 : 288, opacity: trading ? 0 : 1 }}
          transition={shouldReduce ? { duration: 0 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex shrink-0 flex-col overflow-hidden border-r border-ink-700 bg-ink-900"
        >
          <div className="shrink-0 border-b border-ink-700 px-4 py-2">
            <h2 className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              Data
            </h2>
          </div>
          <div className="min-h-0 flex-1">{dataPanel}</div>
        </motion.aside>

        {/* Center: analysis workspace OR simulator */}
        <section className="relative flex min-w-0 flex-1 flex-col bg-ink-950">
          {/* Analysis workspace (all 4 modes) */}
          <div className={`flex min-h-0 flex-1 flex-col ${trading ? "hidden" : ""}`}>
            <AnimatePresence>
              {showMarket && (
                <motion.div
                  key="market"
                  initial={shouldReduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 320, opacity: 1 }}
                  exit={shouldReduce ? {} : { height: 0, opacity: 0 }}
                  transition={shouldReduce ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="shrink-0 overflow-hidden border-b border-ink-700"
                >
                  {marketPanel}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="min-h-0 flex-1">{chatPanel}</div>
          </div>

          {/* Paper-trading simulator */}
          <div className={`min-h-0 flex-1 ${trading ? "" : "hidden"}`}>
            {simulatorPanel}
          </div>

          {dataPreviewOverlay}
        </section>
      </main>
    </div>
  );
}
