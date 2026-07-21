import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { listConversations, getConversation } from "../api.js";

function relativeDate(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ConversationList({
  onNewChat,
  onLoadConversation,
  activeConvId,
  refreshKey,
}) {
  const { session, openModal } = useAuth();
  const [convs, setConvs]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    if (!session?.access_token) { setConvs([]); return; }
    setLoading(true);
    listConversations(session.access_token)
      .then(setConvs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.access_token, refreshKey]);

  const handleLoad = async (conv) => {
    if (!session?.access_token || loadingId) return;
    setLoadingId(conv.id);
    try {
      const full = await getConversation(conv.id, session.access_token);
      onLoadConversation(full);
    } catch {
      // silent — list stays intact
    } finally {
      setLoadingId(null);
    }
  };

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-xs leading-relaxed text-ink-400">
          Sign in to save and revisit your conversations.
        </p>
        <button
          onClick={openModal}
          className="rounded-lg bg-ember-600 px-4 py-2 font-mono text-xs font-semibold text-ink-950 hover:bg-ember-500"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full rounded-lg border border-ink-700 py-1.5 font-mono text-xs text-ink-300 transition-colors hover:border-ember-500/60 hover:text-ember-500"
        >
          + New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <p className="mt-4 text-center font-mono text-[11px] text-ink-600">Loading…</p>
        ) : convs.length === 0 ? (
          <p className="mt-4 px-3 text-center text-xs leading-relaxed text-ink-500">
            No conversations yet. Start chatting to save one.
          </p>
        ) : (
          convs.map((c) => {
            const active = c.id === activeConvId;
            const spinning = loadingId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleLoad(c)}
                disabled={!!loadingId}
                className={`mb-1 w-full rounded-lg px-3 py-2 text-left transition-colors disabled:cursor-wait ${
                  active
                    ? "bg-ember-600/15 text-ember-500"
                    : "text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                }`}
              >
                <p className="truncate text-[13px] font-medium">
                  {spinning ? "Loading…" : c.title}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-500">
                  {relativeDate(c.updated_at || c.created_at)}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
