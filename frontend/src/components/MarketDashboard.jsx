import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchMarketData } from "../api.js";

const PERIODS = ["1mo", "3mo", "6mo", "1y", "5y"];
const PRESETS = ["AAPL", "MSFT", "NVDA", "^GSPC", "EURUSD=X", "USDSGD=X", "BTC-USD"];

const fmt = (n, digits = 2) =>
  n == null ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: digits });

const pct = (n) => (n == null ? "—" : `${n >= 0 ? "▲" : "▼"} ${fmt(Math.abs(n))}%`);

// Read themeable chart colors from CSS variables so axes/grid track the theme.
function getThemeColors() {
  if (typeof window === "undefined") return { grid: "#252c40", axis: "#4a5572", bg: "#0b0e14" };
  const cs = getComputedStyle(document.documentElement);
  const rgb = (name, fallback) => {
    const raw = cs.getPropertyValue(name).trim();
    return raw ? `rgb(${raw.replace(/\s+/g, " ")})` : fallback;
  };
  return {
    grid: rgb("--chart-grid", "#252c40"),
    axis: rgb("--chart-axis", "#4a5572"),
    bg: rgb("--ink-950", "#0b0e14"),
  };
}

// Series A is the warm ember accent; series B (comparison) is sky blue.
const COLOR_A = "#ff8a3d";
const COLOR_B = "#5bc8ff";

function ChartTooltip({ active, payload, label, compare, symbolA, symbolB }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/95 px-3 py-2 font-mono text-[11px] shadow-xl">
      <div className="mb-1 text-ink-300">{label}</div>
      {compare ? (
        payload.map((p) => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey === "a" ? symbolA : symbolB}{" "}
            <span className="font-semibold">{p.value == null ? "—" : `${fmt(p.value)}%`}</span>
          </div>
        ))
      ) : (
        <>
          <div className="text-ink-100">
            close <span className="text-ember-500">{fmt(payload[0].payload.close, 4)}</span>
          </div>
          {payload[0].payload.high != null && (
            <div className="text-ink-500">
              h {fmt(payload[0].payload.high, 4)} · l {fmt(payload[0].payload.low, 4)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-ink-500">{label}</div>
      <div className={`font-mono text-sm font-semibold ${accent || "text-ink-100"}`}>{value}</div>
    </div>
  );
}

// Rebase two close-price series to % return from their first point and merge
// them on date, so two stocks at very different price levels are comparable.
function buildComparison(a, b) {
  const rebase = (points) => {
    const base = points.find((p) => p.close != null)?.close;
    const map = new Map();
    if (!base) return map;
    for (const p of points) {
      map.set(p.date, p.close == null ? null : ((p.close - base) / base) * 100);
    }
    return map;
  };
  const ma = rebase(a.points);
  const mb = rebase(b.points);
  const dates = [...new Set([...ma.keys(), ...mb.keys()])].sort();
  return dates.map((date) => ({ date, a: ma.get(date) ?? null, b: mb.get(date) ?? null }));
}

/**
 * Market intelligence dashboard. Fetches free historical data from the
 * backend (yfinance) and renders it as an animated, glowing area chart.
 * Optionally overlays a second ticker (rebased to % return) for comparison.
 * "Send to AI" injects the series summary into the chat as evidence.
 */
export default function MarketDashboard({ onSendToAI, theme }) {
  const [tickerA, setTickerA] = useState("AAPL");
  const [tickerB, setTickerB] = useState("");
  const [period, setPeriod] = useState("6mo");
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [colors, setColors] = useState(getThemeColors());

  // Re-read chart colors whenever the theme flips.
  useEffect(() => {
    setColors(getThemeColors());
  }, [theme]);

  const load = useCallback(
    async (symbolA, symbolB, p) => {
      const symA = (symbolA || "").trim().toUpperCase();
      const symB = (symbolB || "").trim().toUpperCase();
      if (!symA) return;
      setLoading(true);
      setError(null);
      try {
        const interval = p === "5y" ? "1wk" : "1d";
        const [resA, resB] = await Promise.all([
          fetchMarketData(symA, p, interval),
          symB ? fetchMarketData(symB, p, interval) : Promise.resolve(null),
        ]);
        setDataA(resA);
        setDataB(resB);
        setTickerA(symA);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const compare = Boolean(dataA && dataB);
  const changeA = dataA?.stats?.change_pct ?? 0;
  const changeB = dataB?.stats?.change_pct ?? 0;
  const upA = changeA >= 0;
  const singleColor = upA ? "#5ee6a8" : "#ff6b6b";

  const chartData = compare ? buildComparison(dataA, dataB) : dataA?.points;

  const sendToAI = () => {
    if (!dataA) return;
    if (compare) {
      onSendToAI({
        label: `📈 ${dataA.ticker} vs ${dataB.ticker} ${dataA.period}`,
        text:
          `COMPARISON over ${dataA.period}: ${dataA.ticker} ${changeA >= 0 ? "+" : ""}${fmt(changeA)}% ` +
          `vs ${dataB.ticker} ${changeB >= 0 ? "+" : ""}${fmt(changeB)}%.\n\n` +
          `${dataA.ai_summary}\n\n---\n\n${dataB.ai_summary}`,
      });
    } else {
      onSendToAI({ label: `📈 ${dataA.ticker} ${dataA.period}`, text: dataA.ai_summary });
    }
  };

  return (
    <div className="border-b border-ink-700 bg-ink-950">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <input
          value={tickerA}
          onChange={(e) => setTickerA(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && load(tickerA, tickerB, period)}
          placeholder="AAPL"
          spellCheck={false}
          className="w-32 rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 font-mono text-xs text-ink-100 placeholder-ink-500 focus:border-ember-500 focus:outline-none"
        />
        <span className="font-mono text-[11px] text-ink-500">vs</span>
        <input
          value={tickerB}
          onChange={(e) => setTickerB(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && load(tickerA, tickerB, period)}
          placeholder="compare (optional)"
          spellCheck={false}
          className="w-40 rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 font-mono text-xs text-ink-100 placeholder-ink-500 focus:border-sky-400 focus:outline-none"
        />
        <button
          onClick={() => load(tickerA, tickerB, period)}
          disabled={loading || !tickerA.trim()}
          className="rounded-lg bg-ember-600 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-ember-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Loading…" : "Load"}
        </button>
        {tickerB && (
          <button
            onClick={() => {
              setTickerB("");
              setDataB(null);
            }}
            className="rounded-lg border border-ink-700 px-2 py-1.5 font-mono text-[11px] text-ink-300 hover:bg-ink-800"
          >
            clear vs
          </button>
        )}
        <div className="flex overflow-hidden rounded-lg border border-ink-700">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                if (dataA) load(dataA.ticker, tickerB, p);
              }}
              className={`px-2.5 py-1.5 font-mono text-[11px] transition-colors ${
                period === p
                  ? "bg-ember-600 text-ink-950 font-semibold"
                  : "text-ink-300 hover:bg-ink-800"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => load(p, tickerB, period)}
              className="rounded-full border border-ink-700 px-2 py-0.5 font-mono text-[10px] text-ink-300 hover:border-ember-500 hover:text-ember-500"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="px-4 pt-2 text-xs text-red-400">{error}</p>}

      {/* Stats + chart */}
      {dataA && (
        <>
          <div className={`grid grid-cols-2 gap-2 px-4 pt-3 ${compare ? "sm:grid-cols-4" : "sm:grid-cols-5"}`}>
            {compare ? (
              <>
                <Stat
                  label={`${dataA.ticker} last`}
                  value={`${fmt(dataA.stats.last, 4)} ${dataA.stats.currency || ""}`}
                  accent="text-ember-500"
                />
                <Stat
                  label={`${dataA.ticker} ${dataA.period}`}
                  value={pct(changeA)}
                  accent={upA ? "text-mint-400" : "text-red-400"}
                />
                <Stat
                  label={`${dataB.ticker} last`}
                  value={`${fmt(dataB.stats.last, 4)} ${dataB.stats.currency || ""}`}
                  accent="text-sky-400"
                />
                <Stat
                  label={`${dataB.ticker} ${dataB.period}`}
                  value={pct(changeB)}
                  accent={changeB >= 0 ? "text-mint-400" : "text-red-400"}
                />
              </>
            ) : (
              <>
                <Stat
                  label={`${dataA.ticker} last`}
                  value={`${fmt(dataA.stats.last, 4)} ${dataA.stats.currency || ""}`}
                />
                <Stat
                  label={`${dataA.period} change`}
                  value={pct(changeA)}
                  accent={upA ? "text-mint-400" : "text-red-400"}
                />
                <Stat label="High" value={fmt(dataA.stats.high, 4)} />
                <Stat label="Low" value={fmt(dataA.stats.low, 4)} />
                <Stat label="Ann. volatility" value={`${fmt(dataA.stats.annualized_vol_pct, 1)}%`} />
              </>
            )}
          </div>

          <div className="h-56 px-2 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={compare ? COLOR_A : singleColor} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={compare ? COLOR_A : singleColor} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_B} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={COLOR_B} stopOpacity={0} />
                  </linearGradient>
                  <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid stroke={colors.grid} strokeDasharray="3 6" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: colors.axis, fontSize: 10, fontFamily: "JetBrains Mono" }}
                  tickLine={false}
                  axisLine={{ stroke: colors.grid }}
                  minTickGap={48}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fill: colors.axis, fontSize: 10, fontFamily: "JetBrains Mono" }}
                  tickLine={false}
                  axisLine={false}
                  width={compare ? 52 : 64}
                  tickFormatter={(val) =>
                    compare ? `${fmt(val, 0)}%` : fmt(val, val < 10 ? 4 : 2)
                  }
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      compare={compare}
                      symbolA={dataA?.ticker}
                      symbolB={dataB?.ticker}
                    />
                  }
                  cursor={{ stroke: colors.axis, strokeDasharray: "3 3" }}
                />
                {compare && (
                  <Legend
                    verticalAlign="top"
                    height={24}
                    formatter={(value) => (
                      <span className="font-mono text-[11px]" style={{ color: value === "a" ? COLOR_A : COLOR_B }}>
                        {value === "a" ? dataA.ticker : dataB.ticker} (% return)
                      </span>
                    )}
                  />
                )}
                {compare ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="a"
                      name="a"
                      stroke={COLOR_A}
                      strokeWidth={2.25}
                      fill="url(#fillA)"
                      filter="url(#neonGlow)"
                      dot={false}
                      connectNulls
                      activeDot={{ r: 4, fill: COLOR_A, stroke: colors.bg, strokeWidth: 2 }}
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                    <Area
                      type="monotone"
                      dataKey="b"
                      name="b"
                      stroke={COLOR_B}
                      strokeWidth={2.25}
                      fill="url(#fillB)"
                      filter="url(#neonGlow)"
                      dot={false}
                      connectNulls
                      activeDot={{ r: 4, fill: COLOR_B, stroke: colors.bg, strokeWidth: 2 }}
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                  </>
                ) : (
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={singleColor}
                    strokeWidth={2.25}
                    fill="url(#fillA)"
                    filter="url(#neonGlow)"
                    dot={false}
                    activeDot={{ r: 4, fill: singleColor, stroke: colors.bg, strokeWidth: 2 }}
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <span className="font-mono text-[10px] text-ink-500">
              {compare
                ? `${dataA.ticker} vs ${dataB.ticker} · rebased to % return · Yahoo Finance via yfinance`
                : `${dataA.stats.points} bars · Yahoo Finance via yfinance · free`}
            </span>
            <button
              onClick={sendToAI}
              className="rounded-lg border border-ember-600/40 bg-ember-600/10 px-3 py-1.5 text-xs font-semibold text-ember-500 hover:bg-ember-600/20"
            >
              Send to AI as context →
            </button>
          </div>
        </>
      )}

      {!dataA && !error && (
        <p className="px-4 pb-4 pt-2 text-xs text-ink-500">
          Load a ticker to chart it — or add a second symbol to compare two stocks side by side.
          Stocks (AAPL), indices (^GSPC), FX (EURUSD=X), crypto (BTC-USD).
        </p>
      )}
    </div>
  );
}
