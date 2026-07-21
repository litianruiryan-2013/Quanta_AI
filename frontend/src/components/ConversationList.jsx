import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { listConversations, getConversation, deleteConversation } from "../api.js";

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
  const [convs, setConvs]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [loadingId, setLoadingId]   = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!session?.access_token) { setConvs([]); return; }
    setLoading(true);
    listConversations(session.access_token)
      .then(setConvs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.access_token, refreshKey]);

  const handleLoad = async (conv) => {
    if (!session?.access_token || loadingId || pendingDelete) return;
    setLoadingId(conv.id);
    try {
      const full = await getConversation(conv.id, session.access_token);
      onLoadConversation(full);
    } catch {
      // silent
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!session?.access_token) return;
    setDeletingId(id);
    try {
      await deleteConversation(id, session.access_token);
      setConvs((prev) => prev.filter((c) => c.id !== id));
      if (id === activeConvId) onNewChat();
    } catch {
      // silent — row stays in list
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
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
            const active    = c.id === activeConvId;
            const spinning  = loadingId === c.id;
            const confirming = pendingDelete === c.id;
            const deleting  = deletingId === c.id;

            if (confirming || deleting) {
              return (
                <div
                  key={c.id}
                  className="mb-1 flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2"
                >
                  <span className="flex-1 truncate font-mono text-[11px] text-red-400">
                    {deleting ? "Deleting…" : "Delete?"}
                  </span>
                  {!deleting && (
                    <>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="shrink-0 rounded px-2 py-0.5 font-mono text-[11px] font-semibold text-red-400 hover:bg-red-400/20"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setPendingDelete(null)}
                        className="shrink-0 rounded px-2 py-0.5 font-mono text-[11px] text-ink-500 hover:text-ink-300"
                      >
                        No
                      </button>
                    </>
                  )}
                </div>
              );
            }

            return (
              <div key={c.id} className="group relative mb-1">
                <button
                  onClick={() => handleLoad(c)}
                  disabled={!!loadingId}
                  className={`w-full rounded-lg py-2 pl-3 pr-8 text-left transition-colors disabled:cursor-wait ${
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
                <button
                  onClick={(e) => { e.stopPropagation(); setPendingDelete(c.id); }}
                  title="Delete conversation"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-700 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 size={13} strokeWidth={1.75} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
