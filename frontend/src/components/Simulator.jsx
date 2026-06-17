import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fetchQuotes, fetchMarketData } from "../api.js";

const STORAGE_KEY = "quanta-sim-v1";
const POLL_MS = 20000;
const DEFAULT_CASH = 100000;
const RECORD_MS = 60000; // throttle for equity-curve points

const money = (n) =>
  n == null || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (n) => (n == null || Number.isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`);
const num = (n, d = 4) => (n == null ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d }));
const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `t_${Date.now()}_${Math.random().toString(36).slice(2)}`;

function loadAccount() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const a = JSON.parse(raw);
      if (a && typeof a.cash === "number" && a.positions) {
        if (!Array.isArray(a.history)) a.history = [];
        if (!a.createdAt) a.createdAt = Date.now();
        return a;
      }
    }
  } catch {
    /* ignore */
  }
  return { startingCash: DEFAULT_CASH, cash: DEFAULT_CASH, positions: {}, trades: [], realizedPL: 0, history: [], createdAt: Date.now() };
}

// Themed chart colors pulled from the active CSS variables.
function useChartColors(theme) {
  return useMemo(() => {
    if (typeof window === "undefined") return { grid: "#252c40", axis: "#4a5572", bg: "#0b0e14" };
    const cs = getComputedStyle(document.documentElement);
    const rgb = (name, fb) => {
      const raw = cs.getPropertyValue(name).trim();
      return raw ? `rgb(${raw.replace(/\s+/g, " ")})` : fb;
    };
    return { grid: rgb("--chart-grid", "#252c40"), axis: rgb("--chart-axis", "#4a5572"), bg: rgb("--ink-950", "#0b0e14") };
  }, [theme]);
}

/** Reusable glowing area chart (equity curve + research sparkline). */
function GlowArea({ data, xKey, yKey, color, colors, height = 180, fmt = (v) => v, tooltipLabel = "value" }) {
  const gid = `g_${yKey}_${color.replace("#", "")}`;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <filter id={`${gid}_glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <CartesianGrid stroke={colors.grid} strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: colors.axis, fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickLine={false} axisLine={{ stroke: colors.grid }} minTickGap={42} />
          <YAxis domain={["auto", "auto"]} width={64} tick={{ fill: colors.axis, fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickLine={false} axisLine={false} tickFormatter={fmt} />
          <Tooltip
            contentStyle={{ background: colors.bg, border: `1px solid ${colors.grid}`, borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 11 }}
            labelStyle={{ color: colors.axis }} formatter={(v) => [fmt(v), tooltipLabel]} />
          <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.25}
            fill={`url(#${gid})`} filter={`url(#${gid}_glow)`} dot={false}
            activeDot={{ r: 4, fill: color, stroke: colors.bg, strokeWidth: 2 }}
            animationDuration={700} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Simulator({ onSendToAI, theme }) {
  const [acct, setAcct] = useState(loadAccount);
  const [quotes, setQuotes] = useState({});
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const colors = useChartColors(theme);

  // Trade ticket
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [ticketMsg, setTicketMsg] = useState(null);
  const [resetCash, setResetCash] = useState(String(DEFAULT_CASH));
  // Dedicated ticket lookup state so it never gets stuck on "fetching…".
  const [lookup, setLookup] = useState({ status: "idle", sym: "" });

  // Research
  const [researchSym, setResearchSym] = useState("");
  const [research, setResearch] = useState(null); // {loading,error,data}

  const timerRef = useRef(null);
  const lastRecRef = useRef(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(acct));
  }, [acct]);

  // Poll quotes for held positions only.
  const refresh = useCallback(async () => {
    const tickers = Object.keys(acct.positions);
    if (!tickers.length) return;
    setLoading(true);
    try {
      const { quotes: q } = await fetchQuotes(tickers);
      setQuotes((prev) => ({ ...prev, ...q }));
      setUpdatedAt(new Date());
    } catch {
      /* keep last quotes */
    } finally {
      setLoading(false);
    }
  }, [acct.positions]);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(() => {
      if (!document.hidden) refresh();
    }, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [refresh]);

  // Debounced ticket lookup — depends ONLY on the typed ticker, runs once the
  // user pauses, and resolves to an explicit status (no infinite "fetching").
  useEffect(() => {
    const sym = ticker.trim().toUpperCase();
    if (!sym) {
      setLookup({ status: "idle", sym: "" });
      return;
    }
    setLookup((p) => (p.sym === sym && p.status === "ok" ? p : { status: "pending", sym }));
    const t = setTimeout(async () => {
      setLookup({ status: "loading", sym });
      try {
        const { quotes: q, errors } = await fetchQuotes([sym]);
        const quote = q[sym];
        if (quote?.price != null) {
          setQuotes((prev) => ({ ...prev, [sym]: quote }));
          setLookup({ status: "ok", sym, price: quote.price, changePct: quote.change_pct, currency: quote.currency });
        } else {
          setLookup({ status: "notfound", sym, reason: errors?.[sym] });
        }
      } catch {
        setLookup({ status: "error", sym });
      }
    }, 600);
    return () => clearTimeout(t);
  }, [ticker]);

  // --- Derived metrics ---
  const rows = useMemo(
    () =>
      Object.entries(acct.positions).map(([sym, pos]) => {
        const q = quotes[sym];
        const last = q?.price ?? pos.avgCost;
        const value = last * pos.shares;
        const cost = pos.avgCost * pos.shares;
        const unreal = value - cost;
        const unrealPct = cost ? (unreal / cost) * 100 : 0;
        const dayChange = q?.change != null ? q.change * pos.shares : null;
        return { sym, ...pos, last, value, cost, unreal, unrealPct, dayChange, changePct: q?.change_pct ?? null, hasQuote: q?.price != null };
      }),
    [acct.positions, quotes]
  );

  const holdingsValue = rows.reduce((s, r) => s + r.value, 0);
  const equity = acct.cash + holdingsValue;
  const totalReturnPct = ((equity - acct.startingCash) / acct.startingCash) * 100;
  const unrealizedPL = rows.reduce((s, r) => s + r.unreal, 0);
  const dayChange = rows.reduce((s, r) => s + (r.dayChange ?? 0), 0);
  const dayBasis = equity - dayChange;
  const dayPct = dayBasis ? (dayChange / dayBasis) * 100 : null;

  // Annualized return (CAGR) — only meaningful after ~a day of history.
  const daysElapsed = (Date.now() - acct.createdAt) / 86400000;
  const annualPct =
    daysElapsed >= 1 && acct.startingCash > 0
      ? ((equity / acct.startingCash) ** (365 / daysElapsed) - 1) * 100
      : null;

  // Record equity-curve points (throttled; forced right after a trade).
  useEffect(() => {
    if (!Number.isFinite(equity)) return;
    const hasData = rows.length === 0 || rows.some((r) => r.hasQuote);
    if (!hasData) return;
    const now = Date.now();
    if (acct.history.length && now - lastRecRef.current < RECORD_MS) return;
    lastRecRef.current = now;
    setAcct((prev) => ({ ...prev, history: [...prev.history, { t: now, v: Math.round(equity * 100) / 100 }].slice(-600) }));
  }, [equity, rows, acct.history.length]);

  const equityData = useMemo(
    () =>
      acct.history.map((p) => ({
        ...p,
        label: new Date(p.t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      })),
    [acct.history]
  );
  const equityColor = equity >= acct.startingCash ? "#5ee6a8" : "#ff6b6b";

  // --- Trade execution ---
  const execute = useCallback(
    async (side) => {
      const sym = ticker.trim().toUpperCase();
      const qty = parseFloat(shares);
      setTicketMsg(null);
      if (!sym) return setTicketMsg({ type: "error", text: "Enter a ticker." });
      if (!Number.isFinite(qty) || qty <= 0) return setTicketMsg({ type: "error", text: "Enter a positive share count." });

      let price = quotes[sym]?.price;
      try {
        const { quotes: q } = await fetchQuotes([sym]);
        setQuotes((prev) => ({ ...prev, ...q }));
        price = q[sym]?.price ?? price;
      } catch {
        /* fall back to cached */
      }
      if (price == null) return setTicketMsg({ type: "error", text: `No live price for ${sym}.` });

      lastRecRef.current = 0; // force an equity point after this trade
      setAcct((prev) => {
        const positions = { ...prev.positions };
        const pos = positions[sym] || { shares: 0, avgCost: 0 };
        if (side === "BUY") {
          const cost = qty * price;
          if (cost > prev.cash + 1e-6) {
            setTicketMsg({ type: "error", text: `Not enough cash. Need ${money(cost)}, have ${money(prev.cash)}.` });
            return prev;
          }
          const newShares = pos.shares + qty;
          positions[sym] = { shares: newShares, avgCost: (pos.avgCost * pos.shares + price * qty) / newShares };
          setTicketMsg({ type: "ok", text: `Bought ${qty} ${sym} @ ${money(price)}` });
          return { ...prev, cash: prev.cash - cost, positions,
            trades: [{ id: uid(), ts: Date.now(), side, ticker: sym, shares: qty, price, value: cost }, ...prev.trades].slice(0, 200) };
        }
        if (!pos.shares || pos.shares < qty - 1e-9) {
          setTicketMsg({ type: "error", text: `You only hold ${pos.shares || 0} ${sym}.` });
          return prev;
        }
        const proceeds = qty * price;
        const remaining = pos.shares - qty;
        if (remaining <= 1e-9) delete positions[sym];
        else positions[sym] = { shares: remaining, avgCost: pos.avgCost };
        setTicketMsg({ type: "ok", text: `Sold ${qty} ${sym} @ ${money(price)}` });
        return { ...prev, cash: prev.cash + proceeds, realizedPL: prev.realizedPL + (price - pos.avgCost) * qty, positions,
          trades: [{ id: uid(), ts: Date.now(), side, ticker: sym, shares: qty, price, value: proceeds }, ...prev.trades].slice(0, 200) };
      });
      setShares("");
    },
    [ticker, shares, quotes]
  );

  const resetAccount = () => {
    const start = Math.max(1, parseFloat(resetCash) || DEFAULT_CASH);
    if (!confirm(`Reset the simulator to ${money(start)} cash? This clears all positions, history and trades.`)) return;
    setAcct({ startingCash: start, cash: start, positions: {}, trades: [], realizedPL: 0, history: [], createdAt: Date.now() });
    setQuotes({});
    setTicketMsg(null);
    lastRecRef.current = 0;
  };

  // --- Research ---
  const runResearch = useCallback(async (symArg) => {
    const sym = (symArg ?? researchSym).trim().toUpperCase();
    if (!sym) return;
    setResearchSym(sym);
    setResearch({ loading: true, error: null, data: null });
    try {
      const data = await fetchMarketData(sym, "6mo", "1d");
      setResearch({ loading: false, error: null, data });
    } catch (err) {
      setResearch({ loading: false, error: err.message, data: null });
    }
  }, [researchSym]);

  const researchWithAI = () => {
    if (!research?.data) return;
    onSendToAI(
      { label: `🔎 ${research.data.ticker} research`, text: research.data.ai_summary },
      `Give me a concise research brief on ${research.data.ticker}: what it is, what the recent price ` +
        `action and volatility in the data imply, the key bull and bear points, and how it might fit a ` +
        `diversified portfolio. Educational only, not financial advice.`
    );
  };

  // --- Ticket display helpers ---
  const ticketSym = ticker.trim().toUpperCase();
  const ticketPrice =
    lookup.sym === ticketSym && lookup.status === "ok" ? lookup.price : quotes[ticketSym]?.price ?? null;
  const ticketChangePct =
    lookup.sym === ticketSym && lookup.status === "ok" ? lookup.changePct : quotes[ticketSym]?.change_pct ?? null;
  const ticketStatusText =
    !ticketSym ? "—"
    : ticketPrice != null ? money(ticketPrice)
    : lookup.sym === ticketSym && lookup.status === "loading" ? "looking up…"
    : lookup.sym === ticketSym && lookup.status === "notfound" ? "no quote"
    : lookup.sym === ticketSym && lookup.status === "error" ? "lookup failed"
    : "—";
  const ticketReason =
    lookup.sym === ticketSym && lookup.status === "notfound" ? lookup.reason : null;
  const qtyNum = parseFloat(shares);
  const estCost = ticketPrice && Number.isFinite(qtyNum) ? ticketPrice * qtyNum : null;

  const loadSymbol = (sym) => {
    setTicker(sym);
    setResearchSym(sym);
    runResearch(sym);
  };

  const askReview = () => {
    const posLines = rows.length
      ? rows.map((r) =>
          `- ${r.sym}: ${num(r.shares, 4)} sh, avg cost ${money(r.avgCost)}, last ${money(r.last)}, ` +
          `mkt value ${money(r.value)}, unrealized ${money(r.unreal)} (${pct(r.unrealPct)})`).join("\n")
      : "- (no open positions)";
    const tradeLines = acct.trades.slice(0, 12)
      .map((t) => `- ${new Date(t.ts).toLocaleString()} ${t.side} ${num(t.shares, 4)} ${t.ticker} @ ${money(t.price)}`)
      .join("\n");
    onSendToAI(
      {
        label: `💹 Paper account (${money(equity)})`,
        text:
          `PORTFOLIO CONTEXT — simulated paper-trading account (virtual money, for learning; NOT real holdings)\n` +
          `Starting cash: ${money(acct.startingCash)} | Buying power: ${money(acct.cash)} | Holdings: ${money(holdingsValue)} | ` +
          `Total equity: ${money(equity)} (total return ${pct(totalReturnPct)}, annualized ${pct(annualPct)})\n` +
          `Realized P/L: ${money(acct.realizedPL)} | Unrealized P/L: ${money(unrealizedPL)} | Today: ${pct(dayPct)}\n\n` +
          `Positions:\n${posLines}\n\nRecent trades:\n${tradeLines || "- (none yet)"}`,
      },
      `Review my simulated paper-trading portfolio. Assess diversification, concentration and risk, ` +
        `comment on my realized and unrealized P&L, and suggest 3 specific, actionable adjustments with reasoning. ` +
        `Treat this as an educational simulation, not real financial advice.`
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Account summary */}
      <div className="border-b border-ink-700 px-4 py-3">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink-500">Account value</div>
            <div className="font-mono text-2xl font-bold text-ink-100">{money(equity)}</div>
          </div>
          <Big label="Total return" value={pct(totalReturnPct)} positive={totalReturnPct >= 0} />
          <Big label="Annual. return" value={annualPct == null ? "—" : pct(annualPct)} positive={(annualPct ?? 0) >= 0} muted={annualPct == null} />
          <Big label="Today" value={dayPct == null ? "—" : pct(dayPct)} positive={(dayPct ?? 0) >= 0} muted={dayPct == null} />
          <div className="ml-auto flex items-center gap-2">
            <span className={`flex items-center gap-1 font-mono text-[10px] ${loading ? "text-ember-500" : "text-mint-400"}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${loading ? "animate-pulse bg-ember-500" : "bg-mint-400"}`} />
              {loading ? "updating" : "live"}
            </span>
            {updatedAt && <span className="font-mono text-[10px] text-ink-500">{updatedAt.toLocaleTimeString()}</span>}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Mini label="Buying power" value={money(acct.cash)} />
          <Mini label="Holdings value" value={money(holdingsValue)} />
          <Mini label="Unrealized P/L" value={money(unrealizedPL)} accent={unrealizedPL >= 0 ? "text-mint-400" : "text-red-400"} />
          <Mini label="Realized P/L" value={money(acct.realizedPL)} accent={acct.realizedPL >= 0 ? "text-mint-400" : "text-red-400"} />
        </div>
      </div>

      {/* Equity curve */}
      <div className="border-b border-ink-700 px-2 py-3">
        <div className="px-2 pb-1 font-mono text-[10px] uppercase tracking-widest text-ink-500">
          Account value over time
        </div>
        {equityData.length >= 2 ? (
          <GlowArea data={equityData} xKey="label" yKey="v" color={equityColor} colors={colors}
            height={180} fmt={(v) => `$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            tooltipLabel="equity" />
        ) : (
          <p className="px-2 py-8 text-center text-xs text-ink-500">
            Building your equity curve — points are recorded as prices update and when you trade.
          </p>
        )}
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[340px_1fr]">
        {/* Left: ticket + research + reset */}
        <div className="space-y-3">
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-500">Trade ticket</div>
            <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="Ticker (AAPL, BTC-USD…)" spellCheck={false}
              className="mb-2 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-sm text-ink-100 placeholder-ink-500 focus:border-ember-500 focus:outline-none" />
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-ink-800 px-3 py-2">
              <span className="font-mono text-[11px] text-ink-300">{ticketSym || "—"}</span>
              <span className="font-mono text-sm font-semibold text-ink-100">{ticketStatusText}</span>
              {ticketChangePct != null && ticketPrice != null && (
                <span className={`font-mono text-[11px] ${ticketChangePct >= 0 ? "text-mint-400" : "text-red-400"}`}>{pct(ticketChangePct)}</span>
              )}
            </div>
            <input value={shares} onChange={(e) => setShares(e.target.value)} placeholder="Shares" inputMode="decimal"
              className="mb-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-sm text-ink-100 placeholder-ink-500 focus:border-ember-500 focus:outline-none" />
            <div className="mb-2 flex items-center justify-between px-1 font-mono text-[10px] text-ink-500">
              <span>Est. {estCost != null ? money(estCost) : "—"}</span>
              {ticketPrice != null && (
                <button onClick={() => setShares(String(Math.floor(acct.cash / ticketPrice)))} className="text-ember-500 hover:underline">max buy</button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => execute("BUY")} className="flex-1 rounded-lg bg-mint-400/90 px-3 py-2 text-sm font-bold text-ink-950 hover:bg-mint-400">Buy</button>
              <button onClick={() => execute("SELL")} className="flex-1 rounded-lg border border-red-400/50 bg-red-400/10 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-400/20">Sell</button>
            </div>
            {ticketMsg && <p className={`mt-2 text-[11px] ${ticketMsg.type === "error" ? "text-red-400" : "text-mint-400"}`}>{ticketMsg.text}</p>}
            {ticketReason && <p className="mt-1 text-[11px] text-ink-500">{ticketReason}</p>}
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-ink-500">Orders fill at the latest live price (simulated market order). Virtual money only.</p>
          </div>

          {/* Research */}
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-500">🔎 Research</div>
            <div className="flex gap-2">
              <input value={researchSym} onChange={(e) => setResearchSym(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && runResearch()} placeholder="Symbol" spellCheck={false}
                className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-1.5 font-mono text-xs text-ink-100 placeholder-ink-500 focus:border-ember-500 focus:outline-none" />
              <button onClick={() => runResearch()} disabled={research?.loading || !researchSym.trim()}
                className="rounded-lg bg-ember-600 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-ember-500 disabled:opacity-40">
                {research?.loading ? "…" : "Research"}
              </button>
            </div>
            {research?.error && <p className="mt-2 text-[11px] text-red-400">{research.error}</p>}
            {research?.data && (
              <div className="mt-3">
                <GlowArea data={research.data.points} xKey="date" yKey="close"
                  color={research.data.stats.change_pct >= 0 ? "#5ee6a8" : "#ff6b6b"} colors={colors}
                  height={120} fmt={(v) => num(v, v < 10 ? 3 : 0)} tooltipLabel="close" />
                <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                  <Fact label="Last" value={`${num(research.data.stats.last, 4)} ${research.data.stats.currency || ""}`} />
                  <Fact label="6mo" value={pct(research.data.stats.change_pct)} accent={research.data.stats.change_pct >= 0 ? "text-mint-400" : "text-red-400"} />
                  <Fact label="High" value={num(research.data.stats.high, 2)} />
                  <Fact label="Low" value={num(research.data.stats.low, 2)} />
                  <Fact label="Ann. vol" value={`${num(research.data.stats.annualized_vol_pct, 1)}%`} />
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => loadSymbol(research.data.ticker)} className="flex-1 rounded-lg border border-ink-700 px-2 py-1.5 text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-100">Trade this</button>
                  <button onClick={researchWithAI} className="flex-1 rounded-lg border border-ember-600/40 bg-ember-600/10 px-2 py-1.5 text-xs font-semibold text-ember-500 hover:bg-ember-600/20">♟ Ask AI</button>
                </div>
              </div>
            )}
          </div>

          <button onClick={askReview} className="w-full rounded-lg border border-ember-600/40 bg-ember-600/10 px-3 py-2 text-sm font-semibold text-ember-500 hover:bg-ember-600/20">
            ♟ Ask the Strategy AI to review →
          </button>

          <div className="rounded-xl border border-ink-700 bg-ink-900 p-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-500">Reset account</div>
            <div className="flex gap-2">
              <input value={resetCash} onChange={(e) => setResetCash(e.target.value)} inputMode="numeric"
                className="w-28 rounded-lg border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-xs text-ink-100 focus:border-ember-500 focus:outline-none" />
              <button onClick={resetAccount} className="flex-1 rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-100">Reset to this balance</button>
            </div>
          </div>
        </div>

        {/* Right: positions + blotter */}
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-500">Positions ({rows.length})</div>
            <div className="overflow-x-auto rounded-xl border border-ink-700">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-ink-800 text-ink-300">
                  <tr>{["Symbol", "Shares", "Avg cost", "Last", "Mkt value", "Unreal. P/L", "Day", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-1.5 font-semibold">{h}</th>))}</tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-ink-500">No positions yet. Use the trade ticket to buy your first stock.</td></tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.sym} className="border-t border-ink-800 text-ink-100">
                      <td className="px-3 py-1.5">
                        <button onClick={() => loadSymbol(r.sym)} className="font-semibold text-ember-500 hover:underline">{r.sym}</button>
                      </td>
                      <td className="px-3 py-1.5">{num(r.shares, 4)}</td>
                      <td className="px-3 py-1.5">{money(r.avgCost)}</td>
                      <td className="px-3 py-1.5">{r.hasQuote ? money(r.last) : "—"}</td>
                      <td className="px-3 py-1.5">{money(r.value)}</td>
                      <td className={`px-3 py-1.5 ${r.unreal >= 0 ? "text-mint-400" : "text-red-400"}`}>{money(r.unreal)} ({pct(r.unrealPct)})</td>
                      <td className={`px-3 py-1.5 ${r.changePct == null ? "text-ink-500" : r.changePct >= 0 ? "text-mint-400" : "text-red-400"}`}>{r.changePct == null ? "—" : pct(r.changePct)}</td>
                      <td className="px-3 py-1.5">
                        <button onClick={() => loadSymbol(r.sym)} title="Trade / research" className="text-ink-500 hover:text-ember-500">⇄</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-500">Trade history</div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-ink-700">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="sticky top-0 bg-ink-800 text-ink-300">
                  <tr>{["Time", "Side", "Symbol", "Shares", "Price", "Value"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-1.5 font-semibold">{h}</th>))}</tr>
                </thead>
                <tbody>
                  {acct.trades.length === 0 && (<tr><td colSpan={6} className="px-3 py-6 text-center text-ink-500">No trades yet.</td></tr>)}
                  {acct.trades.map((t) => (
                    <tr key={t.id} className="border-t border-ink-800 text-ink-100">
                      <td className="whitespace-nowrap px-3 py-1.5 text-ink-300">{new Date(t.ts).toLocaleString()}</td>
                      <td className={`px-3 py-1.5 font-semibold ${t.side === "BUY" ? "text-mint-400" : "text-red-400"}`}>{t.side}</td>
                      <td className="px-3 py-1.5">{t.ticker}</td>
                      <td className="px-3 py-1.5">{num(t.shares, 4)}</td>
                      <td className="px-3 py-1.5">{money(t.price)}</td>
                      <td className="px-3 py-1.5">{money(t.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Big({ label, value, positive, muted }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-500">{label}</div>
      <div className={`font-mono text-lg font-semibold ${muted ? "text-ink-300" : positive ? "text-mint-400" : "text-red-400"}`}>{value}</div>
    </div>
  );
}
function Mini({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-ink-500">{label}</div>
      <div className={`font-mono text-sm font-semibold ${accent || "text-ink-100"}`}>{value}</div>
    </div>
  );
}
function Fact({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between rounded bg-ink-800 px-2 py-1">
      <span className="text-ink-500">{label}</span>
      <span className={accent || "text-ink-100"}>{value}</span>
    </div>
  );
}
