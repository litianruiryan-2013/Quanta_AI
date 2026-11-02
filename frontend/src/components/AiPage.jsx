import { useCallback, useState } from "react";
import TopNav from "./TopNav.jsx";
import AiConversationHistory from "./AiConversationHistory.jsx";
import AiChatPanel from "./AiChatPanel.jsx";
import WatchlistPanel from "./WatchlistPanel.jsx";
import useMediaQuery from "../useMediaQuery.js";

const TABS = [
  { id: "history",   label: "History" },
  { id: "chat",      label: "Chat" },
  { id: "watchlist", label: "Watchlist" },
];

export default function AiPage() {
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [mobileTab, setMobileTab] = useState("chat");

  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [convRefreshKey, setConvRefreshKey] = useState(0);
  const [pendingPrompt, setPendingPrompt] = useState(null);

  const onNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    if (isMobile) setMobileTab("chat");
  }, [isMobile]);

  const onLoadConversation = useCallback((conv) => {
    setMessages(conv.messages || []);
    setConversationId(conv.id);
    if (isMobile) setMobileTab("chat");
  }, [isMobile]);

  const onConversationSaved = useCallback((id) => {
    setConversationId(id);
    setConvRefreshKey((k) => k + 1);
  }, []);

  const onAskWhy = useCallback((ticker, quote) => {
    const pct = quote?.change_pct;
    const direction = pct > 0 ? "up" : pct < 0 ? "down" : "";
    const move = pct != null ? `${direction} ${Math.abs(pct).toFixed(2)}%` : "recently";
    setPendingPrompt({
      text: `Why did ${ticker} move ${move}? Use market history and web search to explain, and cite your sources with URLs.`,
      ticker,
    });
    if (isMobile) setMobileTab("chat");
  }, [isMobile]);

  const historyPanel = (
    <AiConversationHistory
      onNewChat={onNewChat}
      onLoadConversation={onLoadConversation}
      activeConvId={conversationId}
      refreshKey={convRefreshKey}
    />
  );
  const chatPanel = (
    <AiChatPanel
      messages={messages}
      setMessages={setMessages}
      conversationId={conversationId}
      onConversationSaved={onConversationSaved}
      pendingPrompt={pendingPrompt}
      onPendingConsumed={() => setPendingPrompt(null)}
    />
  );
  const watchlistPanel = <WatchlistPanel onAskWhy={onAskWhy} />;

  if (isMobile) {
    return (
      <div className="flex h-full flex-col bg-ink-950 text-ink-100">
        <TopNav />
        <nav className="flex gap-1 border-b border-line/8 p-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setMobileTab(t.id)}
              className={`flex-1 rounded-full py-2 font-mono text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                mobileTab === t.id ? "bg-ember-600 text-white" : "text-ink-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <main className="min-h-0 flex-1">
          <div className={`h-full ${mobileTab === "history" ? "" : "hidden"}`}>{historyPanel}</div>
          <div className={`h-full ${mobileTab === "chat" ? "" : "hidden"}`}>{chatPanel}</div>
          <div className={`h-full ${mobileTab === "watchlist" ? "" : "hidden"}`}>{watchlistPanel}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-ink-950 text-ink-100">
      <TopNav />
      <main className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 border-r border-line/8">{historyPanel}</aside>
        <section className="min-w-0 flex-1 border-r border-line/8">{chatPanel}</section>
        <aside className="w-72 shrink-0">{watchlistPanel}</aside>
      </main>
    </div>
  );
}
