import { useCallback, useEffect, useState } from "react";
import FileTree from "./components/FileTree.jsx";
import Chat from "./components/Chat.jsx";
import MarketDashboard from "./components/MarketDashboard.jsx";
import DataPreview from "./components/DataPreview.jsx";
import Simulator from "./components/Simulator.jsx";
import useMediaQuery from "./useMediaQuery.js";
import { getHealth, analyzeSpreadsheet } from "./api.js";

export default function App() {
  // Files (read in-browser; nodes carry File handles)
  const [tree, setTree] = useState(null);
  const [root, setRoot] = useState(null);
  const [attached, setAttached] = useState(new Map()); // path -> node

  // Ollama
  const [ollamaOk, setOllamaOk] = useState(false);
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("llama3");
  const [provider, setProvider] = useState("ollama");

  // Chat (messages lifted here so they survive workspace/tab switches)
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("code");
  const [dataContext, setDataContext] = useState(null);
  const [pendingPrompt, setPendingPrompt] = useState(null);
  const [preview, setPreview] = useState(null);

  // Layout
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

  const onFolder = useCallback((result) => {
    setTree(result.tree);
    setRoot(`${result.tree.name} · ${result.fileCount} files`);
    setAttached(new Map());
    setDataContext(null);
    setPreview(null);
  }, []);

  const toggleFile = useCallback((node) => {
    setAttached((prev) => {
      const next = new Map(prev);
      if (next.has(node.path)) next.delete(node.path);
      else next.set(node.path, node);
      return next;
    });
  }, []);

  const detach = useCallback((path) => {
    setAttached((prev) => {
      const next = new Map(prev);
      next.delete(path);
      return next;
    });
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
      setMode("strategy");
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

  // ---- Shared panels ----
  const fileTreePanel = (
    <FileTree tree={tree} root={root} attached={attached}
      onToggleFile={toggleFile} onOpenData={openData} onFolder={onFolder} />
  );
  const marketPanel = <MarketDashboard onSendToAI={sendEvidenceToAI} theme={theme} />;
  const simulatorPanel = <Simulator onSendToAI={sendEvidenceToAI} theme={theme} />;
  const chatPanel = (
    <Chat
      model={model} models={models} onModelChange={setModel}
      attached={attached} onDetach={detach} ollamaOk={ollamaOk} provider={provider}
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
      { id: "files", label: "Files", icon: "📁" },
      { id: "market", label: "Market", icon: "📈" },
      { id: "trade", label: "Trade", icon: "💹" },
      { id: "chat", label: "Chat", icon: "💬" },
    ];
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-2 border-b border-ink-700 bg-ink-900 px-3 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-ember-600 font-mono text-xs font-bold text-ink-950">Q</div>
          <h1 className="text-sm font-semibold tracking-tight">QUANTA</h1>
          <span className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${ollamaOk ? "bg-mint-400" : "bg-red-400"}`} />
          <button onClick={toggleTheme} aria-label="Toggle theme"
            className="ml-auto rounded-lg border border-ink-700 px-2 py-1 text-xs text-ink-300">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </header>

        <main className="relative min-h-0 flex-1">
          {/* Keep all panels mounted; toggle visibility so state/polling persist. */}
          <div className={`h-full ${mobileTab === "files" ? "" : "hidden"}`}>{fileTreePanel}</div>
          <div className={`h-full overflow-y-auto ${mobileTab === "market" ? "" : "hidden"}`}>{marketPanel}</div>
          <div className={`h-full ${mobileTab === "trade" ? "" : "hidden"}`}>{simulatorPanel}</div>
          <div className={`h-full ${mobileTab === "chat" ? "" : "hidden"}`}>{chatPanel}</div>
          {dataPreviewOverlay}
        </main>

        <nav className="flex border-t border-ink-700 bg-ink-900">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setMobileTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                mobileTab === t.id ? "text-ember-500" : "text-ink-500"}`}>
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  // ============================ DESKTOP ============================
  const trading = workspace === "trading";
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-ink-700 bg-ink-900 px-4 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ember-600 font-mono text-sm font-bold text-ink-950">Q</div>
        <h1 className="text-sm font-semibold tracking-tight">
          QUANTA <span className="font-normal text-ink-500">· Local Code & Strategy Studio</span>
        </h1>
        {/* Workspace switch */}
        <div className="ml-2 flex overflow-hidden rounded-lg border border-ink-700">
          {[["assistant", "💬 Assistant"], ["trading", "💹 Trading"]].map(([id, label]) => (
            <button key={id} onClick={() => setWorkspace(id)}
              className={`px-3 py-1 text-xs font-semibold transition-colors ${
                workspace === id ? "bg-ember-600 text-ink-950" : "text-ink-300 hover:bg-ink-800"}`}>
              {label}
            </button>
          ))}
        </div>
        <span className="rounded-full border border-mint-400/30 bg-mint-400/10 px-2 py-0.5 font-mono text-[10px] text-mint-400">
          offline · free
        </span>
        <div className="ml-auto flex items-center gap-2">
          {!trading && (
            <button onClick={() => setShowMarket((s) => !s)}
              className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
                showMarket ? "border-ember-500 bg-ember-600/15 text-ember-500"
                  : "border-ink-700 text-ink-300 hover:bg-ink-800 hover:text-ink-100"}`}>
              📈 Market dashboard
            </button>
          )}
          <button onClick={toggleTheme} aria-label="Toggle color theme"
            className="rounded-lg border border-ink-700 px-2.5 py-1 text-xs text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100">
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        {/* Assistant workspace: file sidebar + chat (+ market). Hidden, not
            unmounted, in trading mode so chat/files state is preserved. */}
        <aside className={`w-[340px] shrink-0 border-r border-ink-700 bg-ink-900 ${trading ? "hidden" : "block"}`}>
          {fileTreePanel}
        </aside>
        <section className="relative flex min-w-0 flex-1 flex-col bg-ink-950">
          <div className={`flex min-h-0 flex-1 flex-col ${trading ? "hidden" : "flex"}`}>
            {showMarket && marketPanel}
            <div className="min-h-0 flex-1">{chatPanel}</div>
          </div>
          <div className={`min-h-0 flex-1 ${trading ? "block" : "hidden"}`}>
            {simulatorPanel}
          </div>
          {dataPreviewOverlay}
        </section>
      </main>
    </div>
  );
}
