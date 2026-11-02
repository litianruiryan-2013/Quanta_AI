import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { fetchQuotes, fetchSparkline, listWatchlist, addToWatchlist, removeFromWatchlist } from "../api.js";
import { Label, ChangePill, fmtPrice } from "./ManifestUI.jsx";
import PulseLine from "./PulseLine.jsx";
import usePriceFlash from "../usePriceFlash.js";

// Shown to signed-out visitors — not persisted, just a reasonable default.
const DEFAULT_WATCHLIST = [
  { id: "default-aapl", ticker: "AAPL" },
  { id: "default-nvda", ticker: "NVDA" },
  { id: "default-msft", ticker: "MSFT" },
  { id: "default-btc",  ticker: "BTC-USD" },
  { id: "default-spx",  ticker: "^GSPC" },
];

// No backend name lookup exists yet — map the known defaults, fall back to
// the ticker itself for anything a user adds.
const NAME_MAP = {
  AAPL: "Apple Inc.",
  NVDA: "NVIDIA Corp.",
  MSFT: "Microsoft Corp.",
  "BTC-USD": "Bitcoin",
  "^GSPC": "S&P 500 Index",
};

const POLL_MS = 30_000;

function WatchlistRow({ item, quote, spark, signedIn, onRemove, onAskWhy }) {
  const flash = usePriceFlash(quote?.price);
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[12px] font-bold">{item.ticker}</div>
          <div className="truncate font-sans text-[10px] text-ink-500">{NAME_MAP[item.ticker] || item.ticker}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`rounded px-1 font-mono text-[12px] font-bold tabular-nums ${flash}`}>
            {quote ? fmtPrice(quote.price) : "—"}
          </span>
          {signedIn && (
            <button onClick={() => onRemove(item)} title="Remove" className="text-ink-700 hover:text-down">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {quote ? <ChangePill value={quote.change_pct} /> : <span className="font-mono text-[11px] text-ink-700">—</span>}
        {spark?.length > 1 && <PulseLine data={spark} width={64} height={22} glow={false} />}
      </div>

      <button onClick={() => onAskWhy(item.ticker, quote)} className="pill-ember mt-2.5 w-full py-1.5 text-[10px]">
        Why did this move?
      </button>
    </div>
  );
}

export default function WatchlistPanel({ onAskWhy }) {
  const { session, openModal } = useAuth();
  const signedIn = Boolean(session?.access_token);
  const [items, setItems] = useState(signedIn ? [] : DEFAULT_WATCHLIST);
  const [quotes, setQuotes] = useState({});
  const [sparks, setSparks] = useState({});
  const [newTicker, setNewTicker] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  const loadItems = useCallback(async () => {
    if (!signedIn) { setItems(DEFAULT_WATCHLIST); return; }
    try {
      const rows = await listWatchlist(session.access_token);
      setItems(rows.length ? rows : []);
    } catch {
      setItems([]);
    }
  }, [signedIn, session?.access_token]);

  useEffect(() => { loadItems(); }, [loadItems]);

  useEffect(() => {
    if (items.length === 0) { setQuotes({}); return; }
    let active = true;
    const load = async () => {
      try {
        const { quotes: q } = await fetchQuotes(items.map((i) => i.ticker));
        if (active) setQuotes(q || {});
      } catch {
        // silent
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, [items]);

  // 7-day sparkline per ticker — fetched once per watchlist change, not on
  // every quote poll.
  useEffect(() => {
    if (items.length === 0) { setSparks({}); return; }
    let active = true;
    Promise.all(items.map(async (i) => [i.ticker, await fetchSparkline(i.ticker, "5d")]))
      .then((entries) => { if (active) setSparks(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [items]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) return;
    setAdding(true);
    setAddError(null);
    try {
      await addToWatchlist({ ticker }, session.access_token);
      setNewTicker("");
      await loadItems();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (item) => {
    if (!signedIn) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await removeFromWatchlist(item.id, session.access_token);
    } catch {
      loadItems(); // revert on failure
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line/8 px-4 py-3">
        <Label>Watchlist</Label>
        {!signedIn && (
          <p className="mt-1 font-sans text-[11px] leading-relaxed text-ink-500">
            Showing a default list.{" "}
            <button onClick={openModal} className="text-ember-500 underline hover:text-ember-600">Sign in</button>
            {" "}to save your own.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <p className="mt-2 font-mono text-[11px] text-ink-500">No tickers yet.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map((item) => (
              <WatchlistRow
                key={item.id}
                item={item}
                quote={quotes[item.ticker]}
                spark={sparks[item.ticker]}
                signedIn={signedIn}
                onRemove={handleRemove}
                onAskWhy={onAskWhy}
              />
            ))}
          </div>
        )}
      </div>

      {signedIn && (
        <div className="border-t border-line/8 p-3">
          <form onSubmit={handleAdd} className="flex gap-1.5">
            <input
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              placeholder="e.g. TSLA"
              className="focus-glow w-full rounded-xl border border-line/10 bg-ink-900 px-3 py-1.5 font-mono text-[12px] uppercase text-ink-100 outline-none placeholder:text-ink-700"
            />
            <button type="submit" disabled={adding || !newTicker.trim()} className="pill-ember shrink-0 px-3">
              Add
            </button>
          </form>
          {addError && <p className="mt-1.5 font-mono text-[10px] text-down">{addError}</p>}
        </div>
      )}
    </div>
  );
}
