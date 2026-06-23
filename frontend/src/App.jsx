import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Home from "./Home.jsx";
import DataPanel from "./components/FileTree.jsx";
import Chat from "./components/Chat.jsx";
import MarketDashboard from "./components/MarketDashboard.jsx";
import SupplyChainChart from "./components/SupplyChainChart.jsx";
import FXTreasuryChart from "./components/FXTreasuryChart.jsx";
import CommodityArbitrageChart from "./components/CommodityArbitrageChart.jsx";
import DataPreview from "./components/DataPreview.jsx";
import Simulator from "./components/Simulator.jsx";
import useMediaQuery from "./useMediaQuery.js";
import { getHealth, analyzeSpreadsheet } from "./api.js";

// URL slug ↔ internal module name
const SLUG_TO_MODULE = {
  "strategy":             "strategy",
  "supply-chain":         "supply_chain",
  "fx-treasury":          "fx_treasury",
  "commodity-arbitrage":  "commodity_arbitrage",
  "trading":              "simulator",
};

const MODULE_TO_SLUG = {
  "strategy":             "strategy",
  "supply_chain":         "supply-chain",
  "fx_treasury":          "fx-treasury",
  "commodity_arbitrage":  "commodity-arbitrage",
  "simulator":            "trading",
};

function AppShell() {
  const navigate   = useNavigate();
  const { pathname } = useLocation();

  // Derive current module from URL, e.g. /app/supply-chain → "supply_chain"
  const slug          = pathname.split("/app/")[1]?.split("/")[0] ?? "strategy";
  const currentModule = SLUG_TO_MODULE[slug] ?? "strategy";
  const trading       = currentModule === "simulator";
  const mode          = trading ? "strategy" : currentModule;

  // Ollama / provider
  const [ollamaOk, setOllamaOk] = useState(false);
  const [models, setModels]     = useState([]);
  const [model, setModel]       = useState("llama3");
  const [provider, setProvider] = useState("ollama");

  // Chat (lifted so messages survive module switches)
  const [messages, setMessages]         = useState([]);
  const [dataContext, setDataContext]   = useState(null);
  const [pendingPrompt, setPendingPrompt] = useState(null);
  const [preview, setPreview]           = useState(null);

  // Layout
  const isMobile    = useMediaQuery("(max-width: 767px)");
  const [showMarket, setShowMarket] = useState(false);
  const [mobileTab, setMobileTab]   = useState("chat");

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

  const setModule = useCallback((m) => {
    navigate(`/app/${MODULE_TO_SLUG[m] ?? "strategy"}`);
    if (isMobile) setMobileTab("chat");
  }, [navigate, isMobile]);

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
    return () => { active = false; clearInterval(id); };
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

  const sendEvidenceToAI = useCallback(
    (ctx, prompt) => {
      setDataContext(ctx);
      if (prompt) setPendingPrompt(prompt);
      // Stay on the current analysis module so context reaches the right chat.
      // Simulator always routes to strategy since it has no own chat.
      navigate(`/app/${MODULE_TO_SLUG[trading ? "strategy" : mode] ?? "strategy"}`);
      setShowMarket(false); // close the chart panel so the chat is visible
      if (isMobile) setMobileTab("chat");
    },
    [navigate, isMobile, mode, trading]
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

  const providerLabel = provider === "groq" ? "Groq" : provider === "gemini" ? "Gemini" : "Ollama";

  // ---- Shared panels ----
  const activeFile = dataContext ? dataContext.label.replace(/^📊\s*/, "") : null;
  const dataPanel = <DataPanel onOpenData={openData} activeFile={activeFile} />;
  const marketPanel = <MarketDashboard onSendToAI={sendEvidenceToAI} theme={theme} />;
  const simulatorPanel = <Simulator onSendToAI={sendEvidenceToAI} theme={theme} />;

  // Per-module chart panels — each mode gets the visualization that fits its data
  const activeChartPanel =
    mode === "supply_chain"        ? <SupplyChainChart        onSendToAI={sendEvidenceToAI} theme={theme} /> :
    mode === "fx_treasury"         ? <FXTreasuryChart         onSendToAI={sendEvidenceToAI} theme={theme} /> :
    mode === "commodity_arbitrage" ? <CommodityArbitrageChart onSendToAI={sendEvidenceToAI} theme={theme} /> :
                                     marketPanel;

  const chartBtnLabel =
    mode === "supply_chain"        ? "Vendors"  :
    mode === "fx_treasury"         ? "FX Rates" :
    mode === "commodity_arbitrage" ? "Spreads"  : "Chart";

  // Default open height per mode. Strategy needs ~440 to show the full
  // MarketDashboard (controls + stats + chart h-56 + footer).
  const chartPanelHeight =
    mode === "supply_chain" || mode === "commodity_arbitrage" ? 520 :
    mode === "fx_treasury"                                    ? 400 : 440;

  // User-dragged height override — resets to mode default on module switch.
  const [userChartHeight, setUserChartHeight] = useState(null);
  useEffect(() => { setUserChartHeight(null); }, [mode]);
  const effectiveChartHeight = userChartHeight ?? chartPanelHeight;

  // Ref on the chart panel so we can set its height directly during drag
  // without triggering React re-renders on every mousemove.
  const chartPanelRef = useRef(null);

  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    const startY    = e.touches ? e.touches[0].clientY : e.clientY;
    const startH    = chartPanelRef.current?.offsetHeight ?? effectiveChartHeight;

    const onMove = (ev) => {
      const y    = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const newH = Math.max(160, Math.min(startH + (y - startY), 720));
      if (chartPanelRef.current) chartPanelRef.current.style.height = `${newH}px`;
    };
    const onUp = () => {
      const finalH = chartPanelRef.current?.offsetHeight ?? effectiveChartHeight;
      setUserChartHeight(finalH);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend",  onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend",  onUp);
  }, [effectiveChartHeight]);
  const chatPanel = (
    <Chat
      model={model} models={models} onModelChange={setModel}
      ollamaOk={ollamaOk} provider={provider}
      mode={mode} onModeChange={(m) => navigate(`/app/${MODULE_TO_SLUG[m] ?? "strategy"}`)}
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
          <div className={`h-full overflow-y-auto ${mobileTab === "market" ? "" : "hidden"}`}>{activeChartPanel}</div>
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
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ember-600 font-mono text-sm font-bold text-ink-950">
            Q
          </div>
          <span className="font-mono text-sm font-bold tracking-[0.15em] text-ink-100">QUANTA</span>
        </div>

        <div className="h-5 w-px shrink-0 bg-ink-700" />

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

        {!trading && (
          <button
            onClick={() => setShowMarket((s) => !s)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
              showMarket
                ? "border-ember-500/60 bg-ember-600/15 text-ember-500"
                : "border-ink-700 text-ink-500 hover:border-ink-500 hover:text-ink-100"
            }`}
          >
            <span className="text-[10px]">▲</span> {chartBtnLabel}
          </button>
        )}

        <span className={`flex items-center gap-1.5 font-mono text-[11px] ${ollamaOk ? "text-mint-400" : "text-red-400"}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${ollamaOk ? "bg-mint-400" : "bg-red-400"}`} />
          {providerLabel}
        </span>

        <span className="rounded-full border border-ink-700 px-2 py-0.5 font-mono text-[10px] text-ink-500">
          offline · free
        </span>

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

        <section className="relative flex min-w-0 flex-1 flex-col bg-ink-950">
          <div className={`flex min-h-0 flex-1 flex-col ${trading ? "hidden" : ""}`}>
            <AnimatePresence>
              {showMarket && (
                <motion.div
                  ref={chartPanelRef}
                  key="market"
                  initial={shouldReduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: effectiveChartHeight, opacity: 1 }}
                  exit={shouldReduce ? {} : { height: 0, opacity: 0 }}
                  transition={shouldReduce ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="shrink-0 overflow-y-auto border-b border-ink-700"
                >
                  {activeChartPanel}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Drag handle — only rendered while chart panel is open */}
            {showMarket && (
              <div
                onMouseDown={onResizeStart}
                onTouchStart={onResizeStart}
                title="Drag to resize"
                className="group flex h-3 shrink-0 cursor-row-resize items-center justify-center bg-ink-950"
              >
                <div className="h-0.5 w-10 rounded-full bg-ink-700 transition-colors group-hover:bg-ember-500/60" />
              </div>
            )}

            <div className="min-h-0 flex-1">{chatPanel}</div>
          </div>

          <div className={`min-h-0 flex-1 ${trading ? "" : "hidden"}`}>
            {simulatorPanel}
          </div>

          {dataPreviewOverlay}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  // Theme is also needed on the Home route, so read it here for the Home prop.
  // AppShell manages its own copy with localStorage sync.
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

  const navigate = useNavigate();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Home
            onLaunch={() => navigate("/app/strategy")}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        }
      />
      <Route path="/app" element={<Navigate to="/app/strategy" replace />} />
      <Route path="/app/:module" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
