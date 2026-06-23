import { useCallback, useEffect, useState } from "react";
import {
  Area, AreaChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fetchMarketData } from "../api.js";
import QuantaLoader from "./QuantaLoader.jsx";

const FX_PRESETS = ["EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDSGD=X", "USDCNY=X", "AUDUSD=X"];
const PERIODS    = ["1mo", "3mo", "6mo", "1y", "2y"];
const COLOR_UP   = "#5bc8ff"; // sky-400 — typical FX treasury accent
const COLOR_DOWN = "#ff8a3d"; // ember-500

const fmt = (n, d = 4) =>
  n == null ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d });

const pct = (n) =>
  n == null ? "—" : `${n >= 0 ? "▲" : "▼"} ${fmt(Math.abs(n), 2)}%`;

function getThemeColors() {
  if (typeof window === "undefined") return { grid: "#252c40", axis: "#4a5572", bg: "#0b0e14" };
  const cs = getComputedStyle(document.documentElement);
  const rgb = (name, fb) => {
    const raw = cs.getPropertyValue(name).trim();
    return raw ? `rgb(${raw.replace(/\s+/g, " ")})` : fb;
  };
  return {
    grid: rgb("--chart-grid", "#252c40"),
    axis: rgb("--chart-axis", "#4a5572"),
    bg:   rgb("--ink-950",    "#0b0e14"),
  };
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-ink-500">{label}</div>
      <div className={`font-mono text-sm font-semibold ${accent ?? "text-ink-100"}`}>{value}</div>
    </div>
  );
}

function FXTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/95 px-3 py-2 font-mono text-[11px] shadow-xl">
      <div className="mb-1 text-ink-300">{label}</div>
      <div className="text-ink-100">
        rate <span className="font-semibold" style={{ color: COLOR_UP }}>{fmt(row.close, 5)}</span>
      </div>
      {row.high != null && (
        <div className="text-ink-500">
          h {fmt(row.high, 5)} · l {fmt(row.low, 5)}
        </div>
      )}
    </div>
  );
}

export default function FXTreasuryChart({ onSendToAI, theme }) {
  const [pair, setPair]       = useState("EURUSD=X");
  const [period, setPeriod]   = useState("6mo");
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [colors, setColors]   = useState(getThemeColors());

  useEffect(() => { setColors(getThemeColors()); }, [theme]);

  const load = useCallback(async (p, per) => {
    const sym = (p || "").trim().toUpperCase();
    if (!sym) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMarketData(sym, per, per === "2y" ? "1wk" : "1d");
      setData(res);
      setPair(sym);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const changePct  = data?.stats?.change_pct ?? 0;
  const lineColor  = changePct >= 0 ? COLOR_UP : COLOR_DOWN;

  const sendToAI = () => {
    if (!data) return;
    onSendToAI(
      { label: `📈 ${data.ticker} ${data.period}`, text: data.ai_summary },
      `Analyze the ${data.ticker} FX rate data. Identify the key trend, any notable inflection ` +
        `points in the period, and the margin/hedging implications for a business with exposure ` +
        `to this currency pair. Recommend an appropriate hedge instrument and tenor.`
    );
  };

  return (
    <div className="border-b border-ink-700 bg-ink-950">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <input
          value={pair}
          onChange={(e) => setPair(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && load(pair, period)}
          placeholder="EURUSD=X"
          spellCheck={false}
          className="w-36 rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 font-mono text-xs text-ink-100 placeholder-ink-500 focus:border-sky-400 focus:outline-none"
        />
        <button
          onClick={() => load(pair, period)}
          disabled={loading || !pair.trim()}
          className="rounded-lg bg-sky-400/15 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-400/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Loading…" : "Load"}
        </button>

        <div className="flex overflow-hidden rounded-lg border border-ink-700">
          {PERIODS.map((p) => (
            <button key={p}
              onClick={() => { setPeriod(p); if (data) load(data.ticker, p); }}
              className={`px-2.5 py-1.5 font-mono text-[11px] transition-colors ${
                period === p
                  ? "bg-sky-400/20 font-semibold text-sky-400"
                  : "text-ink-300 hover:bg-ink-800"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap gap-1">
          {FX_PRESETS.map((p) => (
            <button key={p}
              onClick={() => load(p, period)}
              className="rounded-full border border-ink-700 px-2 py-0.5 font-mono text-[10px] text-ink-300 hover:border-sky-400 hover:text-sky-400"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="px-4 pt-2 text-xs text-red-400">{error}</p>}

      {loading && !data && (
        <div className="flex h-44 items-center justify-center">
          <QuantaLoader label="Fetching FX data…" />
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2 px-4 pt-3 sm:grid-cols-4">
            <Stat label={`${data.ticker} rate`} value={fmt(data.stats.last, 5)} accent="text-sky-400" />
            <Stat label={`${data.period} change`} value={pct(changePct)}
              accent={changePct >= 0 ? "text-mint-400" : "text-red-400"} />
            <Stat label="Period high" value={fmt(data.stats.high, 5)} />
            <Stat label="Ann. volatility" value={`${fmt(data.stats.annualized_vol_pct, 1)}%`} />
          </div>

          <div className="h-52 px-2 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fxFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={lineColor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0}    />
                  </linearGradient>
                  <filter id="fxGlow" x="-50%" y="-50%" width="200%" height="200%">
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
                  width={62}
                  tickFormatter={(v) => fmt(v, 4)}
                />
                <Tooltip content={<FXTooltip />}
                  cursor={{ stroke: colors.axis, strokeDasharray: "3 3" }} />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={lineColor}
                  strokeWidth={2.25}
                  fill="url(#fxFill)"
                  filter="url(#fxGlow)"
                  dot={false}
                  activeDot={{ r: 4, fill: lineColor, stroke: colors.bg, strokeWidth: 2 }}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <span className="font-mono text-[10px] text-ink-500">
              {data.stats.points} bars · Yahoo Finance via yfinance · free
            </span>
            <button onClick={sendToAI}
              className="rounded-lg border border-sky-400/40 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-400/20">
              Send to AI as context →
            </button>
          </div>
        </>
      )}

      {!data && !error && !loading && (
        <p className="px-4 pb-4 pt-2 text-xs text-ink-500">
          Load an FX pair to chart historical rates. Use yfinance format: EURUSD=X, GBPUSD=X, USDJPY=X.
        </p>
      )}
    </div>
  );
}
