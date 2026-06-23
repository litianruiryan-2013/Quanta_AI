import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const COLOR_LOCAL     = "#ff8a3d"; // ember-500 — local/regional price
const COLOR_BENCHMARK = "#5bc8ff"; // sky-400  — global benchmark

const fmt = (n, d = 2) =>
  n == null ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d });

function getThemeColors() {
  if (typeof window === "undefined") return { grid: "#252c40", axis: "#4a5572" };
  const cs = getComputedStyle(document.documentElement);
  const rgb = (name, fb) => {
    const raw = cs.getPropertyValue(name).trim();
    return raw ? `rgb(${raw.replace(/\s+/g, " ")})` : fb;
  };
  return { grid: rgb("--chart-grid", "#252c40"), axis: rgb("--chart-axis", "#4a5572") };
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-ink-500">{label}</div>
      <div className={`font-mono text-sm font-semibold ${accent ?? "text-ink-100"}`}>{value}</div>
    </div>
  );
}

function ArbTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const local = payload.find((p) => p.dataKey === "local")?.value;
  const bench = payload.find((p) => p.dataKey === "benchmark")?.value;
  const spread    = bench != null && local != null ? bench - local : null;
  const spreadPct = spread != null && local ? (spread / local) * 100 : null;
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/95 px-3 py-2 font-mono text-[11px] shadow-xl">
      <div className="mb-1 font-semibold text-ink-100">{label}</div>
      <div style={{ color: COLOR_LOCAL }}>
        local <span className="font-semibold">{fmt(local)}</span>
      </div>
      <div style={{ color: COLOR_BENCHMARK }}>
        benchmark <span className="font-semibold">{fmt(bench)}</span>
      </div>
      {spread != null && (
        <div className={spread >= 0 ? "text-mint-400" : "text-red-400"}>
          spread {spread >= 0 ? "+" : ""}{fmt(spread)} ({spreadPct >= 0 ? "+" : ""}{fmt(spreadPct, 1)}%)
        </div>
      )}
    </div>
  );
}

const DEFAULT_ROWS = [
  { id: 1, product: "Brent Crude",   local: 78.4,  benchmark: 82.1  },
  { id: 2, product: "LME Copper",    local: 8820,  benchmark: 9150  },
  { id: 3, product: "CME Corn",      local: 4.42,  benchmark: 4.71  },
  { id: 4, product: "ICE Coffee",    local: 1.82,  benchmark: 1.95  },
  { id: 5, product: "CBOT Soybeans", local: 11.2,  benchmark: 11.8  },
];
let _nextId = 6;

export default function CommodityArbitrageChart({ onSendToAI, theme }) {
  const [rows, setRows]     = useState(DEFAULT_ROWS);
  const [colors, setColors] = useState(getThemeColors());

  useEffect(() => { setColors(getThemeColors()); }, [theme]);

  const withSpreads = rows.map((r) => {
    const spread    = (r.benchmark || 0) - (r.local || 0);
    const spreadPct = r.local ? (spread / r.local) * 100 : 0;
    return { ...r, spread, spreadPct };
  });

  const bySpread  = [...withSpreads].sort((a, b) => Math.abs(b.spreadPct) - Math.abs(a.spreadPct));
  const widest    = bySpread[0];
  const avgSpread = withSpreads.reduce((s, r) => s + r.spreadPct, 0) / (withSpreads.length || 1);
  const longCount = withSpreads.filter((r) => r.spreadPct > 5).length;

  const update    = (id, field, value) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const addRow    = () =>
    setRows((p) => [...p, { id: _nextId++, product: "New commodity", local: 0, benchmark: 0 }]);
  const removeRow = (id) => setRows((p) => p.filter((r) => r.id !== id));

  const sendToAI = () => {
    const lines = bySpread
      .map(
        (r, i) =>
          `${i + 1}. ${r.product} — local ${fmt(r.local)}, benchmark ${fmt(r.benchmark)}, ` +
          `spread ${r.spread >= 0 ? "+" : ""}${fmt(r.spread)} ` +
          `(${r.spreadPct >= 0 ? "+" : ""}${fmt(r.spreadPct, 1)}%) ` +
          `→ ${r.spreadPct > 5 ? "LONG" : r.spreadPct < -5 ? "SHORT" : "NEUTRAL"}`
      )
      .join("\n");

    onSendToAI(
      {
        label: `💎 Arb Spreads (${rows.length} commodities)`,
        text:
          `COMMODITY ARBITRAGE CONTEXT — Regional vs Benchmark Price Comparison\n` +
          `${rows.length} commodities. Widest spread: ${widest?.product} ` +
          `(${fmt(widest?.spreadPct, 1)}%). Avg spread: ${fmt(avgSpread, 1)}%. ` +
          `LONG signals (>5%): ${longCount}.\n\nSorted by absolute spread:\n${lines}`,
      },
      `Analyze these commodity arbitrage spreads. Identify the strongest buy/sell signals, ` +
        `flag any basis-risk or quality/grade factors that may explain the gaps (mark with ⚠), ` +
        `and rank the top 3 opportunities by net margin potential.`
    );
  };

  return (
    <div className="border-b border-ink-700 bg-ink-950">
      {/* Grouped bar chart */}
      <div className="h-52 px-2 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barGap={3}>
            <defs>
              <filter id="arbGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="product"
              tick={{ fill: colors.axis, fontSize: 9, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={{ stroke: colors.grid }}
              interval={0}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: colors.axis, fontSize: 10, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={false}
              width={54}
              tickFormatter={(v) => fmt(v, 0)}
            />
            <Tooltip content={<ArbTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Legend
              verticalAlign="top"
              height={20}
              formatter={(value) => (
                <span className="font-mono text-[10px]"
                  style={{ color: value === "local" ? COLOR_LOCAL : COLOR_BENCHMARK }}>
                  {value}
                </span>
              )}
            />
            <Bar dataKey="local" name="local" fill={COLOR_LOCAL}
              filter="url(#arbGlow)" radius={[3, 3, 0, 0]}
              animationDuration={900} animationEasing="ease-out" />
            <Bar dataKey="benchmark" name="benchmark" fill={COLOR_BENCHMARK}
              filter="url(#arbGlow)" radius={[3, 3, 0, 0]}
              animationDuration={900} animationEasing="ease-out" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 py-2">
        <Stat label="Commodities" value={rows.length} />
        <Stat label="Widest spread" value={widest ? `${fmt(widest.spreadPct, 1)}%` : "—"}
          accent={widest?.spreadPct > 0 ? "text-mint-400" : "text-red-400"} />
        <Stat label="Avg spread" value={`${fmt(avgSpread, 1)}%`}
          accent={avgSpread > 0 ? "text-mint-400" : avgSpread < 0 ? "text-red-400" : "text-ink-100"} />
      </div>

      {/* Editable table */}
      <div className="overflow-x-auto px-4 pb-1">
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr className="text-left text-ink-500">
              <th className="pb-1 font-semibold">Commodity</th>
              <th className="pb-1 pr-2 text-right font-semibold" style={{ color: COLOR_LOCAL }}>Local</th>
              <th className="pb-1 pr-2 text-right font-semibold" style={{ color: COLOR_BENCHMARK }}>Benchmark</th>
              <th className="pb-1 pr-2 text-right font-semibold">Spread %</th>
              <th className="w-4" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sp = r.local ? (((r.benchmark || 0) - r.local) / r.local) * 100 : 0;
              return (
                <tr key={r.id} className="border-t border-ink-800">
                  <td className="py-0.5 pr-2">
                    <input value={r.product}
                      onChange={(e) => update(r.id, "product", e.target.value)}
                      className="w-full bg-transparent text-ink-100 focus:outline-none" />
                  </td>
                  <td className="py-0.5 pr-2 text-right">
                    <input type="number" value={r.local}
                      onChange={(e) => update(r.id, "local", Number(e.target.value))}
                      className="w-20 bg-transparent text-right focus:outline-none"
                      style={{ color: COLOR_LOCAL }} />
                  </td>
                  <td className="py-0.5 pr-2 text-right">
                    <input type="number" value={r.benchmark}
                      onChange={(e) => update(r.id, "benchmark", Number(e.target.value))}
                      className="w-20 bg-transparent text-right focus:outline-none"
                      style={{ color: COLOR_BENCHMARK }} />
                  </td>
                  <td className={`py-0.5 pr-2 text-right font-semibold ${
                    sp > 0 ? "text-mint-400" : sp < 0 ? "text-red-400" : "text-ink-500"}`}>
                    {sp >= 0 ? "+" : ""}{fmt(sp, 1)}%
                  </td>
                  <td>
                    <button onClick={() => removeRow(r.id)}
                      className="text-ink-700 hover:text-red-400">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button onClick={addRow}
          className="mt-1 font-mono text-[10px] text-ink-500 hover:text-ink-300">
          + Add commodity
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <span className="font-mono text-[10px] text-ink-500">
          <span style={{ color: COLOR_LOCAL }}>■</span> local &nbsp;
          <span style={{ color: COLOR_BENCHMARK }}>■</span> benchmark · edit rows above
        </span>
        <button onClick={sendToAI}
          className="rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-1.5 text-xs font-semibold text-ember-500 hover:bg-ember-500/20">
          Send to AI as context →
        </button>
      </div>
    </div>
  );
}
