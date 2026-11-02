import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import TopNav from "./TopNav.jsx";
import PulseLine from "./PulseLine.jsx";
import usePriceFlash from "../usePriceFlash.js";
import { Label, fmtPrice, fmtCompact } from "./ManifestUI.jsx";
import { fetchQuotes, fetchSparkline, listHoldings, addHolding, removeHolding } from "../api.js";

// Shown to signed-out visitors — illustrative only, never persisted.
const DEMO_HOLDINGS = [
  { id: "demo-aapl", ticker: "AAPL", quantity: 10, cost_basis: 190 },
  { id: "demo-nvda", ticker: "NVDA", quantity: 15, cost_basis: 110 },
  { id: "demo-msft", ticker: "MSFT", quantity: 8,  cost_basis: 380 },
  { id: "demo-btc",  ticker: "BTC-USD", quantity: 0.2, cost_basis: 58000 },
];

const POLL_MS = 30_000;

function HoldingRow({ holding, quote, spark, totalValue, signedIn, onRemove }) {
  const price = quote?.price;
  const value = price != null ? price * holding.quantity : null;
  const cost = holding.quantity * holding.cost_basis;
  const pnl = value != null ? value - cost : null;
  const pnlPct = pnl != null && cost ? (pnl / cost) * 100 : null;
  const weight = value != null && totalValue ? (value / totalValue) * 100 : 0;
  const gain = pnl > 0, loss = pnl < 0;
  const flash = usePriceFlash(price);

  return (
    <div className="card p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[13px] font-bold">{holding.ticker}</div>
          <div className="font-mono text-[10px] text-ink-500">
            {holding.quantity} @ {fmtPrice(holding.cost_basis)}
          </div>
        </div>
        <div className="text-right">
          <div className={`rounded px-1 font-mono text-sm font-bold tabular-nums ${flash}`}>
            {value != null ? `$${fmtPrice(value)}` : "—"}
          </div>
          <div className={`font-mono text-[11px] font-semibold ${gain ? "text-up" : loss ? "text-down" : "text-ink-500"}`}>
            {pnl != null ? `${pnl >= 0 ? "+" : ""}${fmtPrice(pnl)} (${pnlPct.toFixed(1)}%)` : "—"}
          </div>
        </div>
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line/8">
        <div
          className={`h-full rounded-full ${gain ? "bg-up" : loss ? "bg-down" : "bg-ember-600"}`}
          style={{ width: `${Math.min(100, Math.max(2, weight))}%` }}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="font-mono text-[10px] text-ink-500">{weight.toFixed(1)}% of portfolio</span>
        <div className="flex items-center gap-2">
          {spark?.length > 1 && <PulseLine data={spark} width={60} height={20} glow={false} />}
          {signedIn && (
            <button onClick={() => onRemove(holding)} title="Remove" className="text-ink-700 hover:text-down">✕</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const { session, openModal } = useAuth();
  const signedIn = Boolean(session?.access_token);
  const [holdings, setHoldings] = useState(signedIn ? [] : DEMO_HOLDINGS);
  const [quotes, setQuotes] = useState({});
  const [sparks, setSparks] = useState({});

  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  const loadHoldings = useCallback(async () => {
    if (!signedIn) { setHoldings(DEMO_HOLDINGS); return; }
    try {
      const rows = await listHoldings(session.access_token);
      setHoldings(rows);
    } catch {
      setHoldings([]);
    }
  }, [signedIn, session?.access_token]);

  useEffect(() => { loadHoldings(); }, [loadHoldings]);

  useEffect(() => {
    if (holdings.length === 0) { setQuotes({}); return; }
    const tickers = [...new Set(holdings.map((h) => h.ticker))];
    let active = true;
    const load = () => fetchQuotes(tickers).then(({ quotes: q }) => { if (active) setQuotes(q || {}); }).catch(() => {});
    load();
    const id = setInterval(load, POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, [holdings]);

  useEffect(() => {
    if (holdings.length === 0) { setSparks({}); return; }
    const tickers = [...new Set(holdings.map((h) => h.ticker))];
    let active = true;
    Promise.all(tickers.map(async (t) => [t, await fetchSparkline(t, "1mo")]))
      .then((entries) => { if (active) setSparks(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [holdings]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    const q = Number(quantity);
    const c = Number(costBasis);
    if (!t || !q || !c) return;
    setAdding(true);
    setAddError(null);
    try {
      await addHolding({ ticker: t, quantity: q, cost_basis: c }, session.access_token);
      setTicker(""); setQuantity(""); setCostBasis("");
      await loadHoldings();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (holding) => {
    if (!signedIn) return;
    setHoldings((prev) => prev.filter((h) => h.id !== holding.id));
    try {
      await removeHolding(holding.id, session.access_token);
    } catch {
      loadHoldings();
    }
  };

  let totalValue = 0, totalCost = 0;
  for (const h of holdings) {
    const price = quotes[h.ticker]?.price;
    if (price != null) totalValue += price * h.quantity;
    totalCost += h.quantity * h.cost_basis;
  }
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost ? (totalPnl / totalCost) * 100 : 0;
  const gain = totalPnl > 0, loss = totalPnl < 0;

  return (
    <div className="flex min-h-full flex-col bg-ink-950 text-ink-100">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <div className="fade-rise flex flex-wrap items-start justify-between gap-4">
          <div>
            <Label>QUANTA Business</Label>
            <h1 className="mt-2 font-display text-3xl font-bold">Portfolio</h1>
            {!signedIn && (
              <p className="mt-1 font-sans text-sm text-ink-500">
                Showing a sample portfolio.{" "}
                <button onClick={openModal} className="text-ember-500 underline hover:text-ember-600">Sign in</button>
                {" "}to track your own.
              </p>
            )}
          </div>
          <div className="card-raised px-5 py-4 text-right">
            <Label>Total value</Label>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">${fmtCompact(totalValue)}</div>
            <div className={`font-mono text-sm font-semibold ${gain ? "text-up" : loss ? "text-down" : "text-ink-500"}`}>
              {totalCost ? `${totalPnl >= 0 ? "+" : ""}${fmtPrice(totalPnl)} (${totalPnlPct.toFixed(1)}%)` : "—"}
            </div>
          </div>
        </div>

        <div className="fade-rise mt-8 grid gap-3 sm:grid-cols-2" style={{ animationDelay: "80ms" }}>
          {holdings.length === 0 ? (
            <p className="font-mono text-[11px] text-ink-500">No holdings yet — add your first below.</p>
          ) : (
            holdings.map((h) => (
              <HoldingRow
                key={h.id}
                holding={h}
                quote={quotes[h.ticker]}
                spark={sparks[h.ticker]}
                totalValue={totalValue}
                signedIn={signedIn}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>

        {signedIn && (
          <form onSubmit={handleAdd} className="fade-rise card-raised mt-6 flex max-w-lg flex-wrap items-end gap-2 p-4" style={{ animationDelay: "140ms" }}>
            <div className="min-w-[90px] flex-1">
              <Label>Ticker</Label>
              <input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL"
                className="focus-glow mt-1 w-full rounded-xl border border-line/10 bg-ink-900 px-3 py-2 font-mono text-sm uppercase text-ink-100 outline-none placeholder:text-ink-700" />
            </div>
            <div className="min-w-[90px] flex-1">
              <Label>Quantity</Label>
              <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="10"
                className="focus-glow mt-1 w-full rounded-xl border border-line/10 bg-ink-900 px-3 py-2 font-mono text-sm text-ink-100 outline-none placeholder:text-ink-700" />
            </div>
            <div className="min-w-[110px] flex-1">
              <Label>Cost / unit</Label>
              <input type="number" min="0" step="any" value={costBasis} onChange={(e) => setCostBasis(e.target.value)} placeholder="190.00"
                className="focus-glow mt-1 w-full rounded-xl border border-line/10 bg-ink-900 px-3 py-2 font-mono text-sm text-ink-100 outline-none placeholder:text-ink-700" />
            </div>
            <button type="submit" disabled={adding} className="pill-ember focus-glow">
              {adding ? "Adding…" : "Add holding"}
            </button>
            {addError && <p className="w-full font-mono text-[11px] text-down">{addError}</p>}
          </form>
        )}
      </main>
    </div>
  );
}
