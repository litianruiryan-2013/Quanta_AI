import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const COLOR_LOW  = "#5ee6a8"; // mint-400 — low risk
const COLOR_MED  = "#ff8a3d"; // ember-500 — medium risk
const COLOR_HIGH = "#ff6b6b"; // red — high risk

const riskColor = (r) => r >= 8 ? COLOR_HIGH : r >= 6 ? COLOR_MED : COLOR_LOW;

const fmt = (n, d = 1) =>
  n == null ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d });

function getThemeColors() {
  if (typeof window === "undefined") return { grid: "#252c40", axis: "#4a5572", bg: "#0b0e14" };
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

function SCTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/95 px-3 py-2 font-mono text-[11px] shadow-xl">
      <div className="mb-1 font-semibold text-ink-100">{label}</div>
      <div style={{ color: riskColor(row.risk) }}>
        spend <span className="font-semibold">${fmt(row.spend)}M</span>
      </div>
      <div className="text-ink-500">risk {row.risk}/10</div>
    </div>
  );
}

const DEFAULT_ROWS = [
  { id: 1, vendor: "Foxconn",      spend: 420, risk: 8 },
  { id: 2, vendor: "TSMC",         spend: 380, risk: 9 },
  { id: 3, vendor: "Samsung SDI",  spend: 210, risk: 6 },
  { id: 4, vendor: "Flex Ltd",     spend: 175, risk: 5 },
  { id: 5, vendor: "Jabil",        spend: 140, risk: 4 },
];
let _nextId = 6;

export default function SupplyChainChart({ onSendToAI, theme }) {
  const [rows, setRows]     = useState(DEFAULT_ROWS);
  const [colors, setColors] = useState(getThemeColors());

  useEffect(() => { setColors(getThemeColors()); }, [theme]);

  const sorted   = [...rows].sort((a, b) => b.spend - a.spend);
  const total    = rows.reduce((s, r) => s + (Number(r.spend) || 0), 0);
  const highRisk = rows.filter((r) => r.risk >= 7).length;
  const topShare = total > 0 ? ((sorted[0]?.spend || 0) / total) * 100 : 0;

  const update = (id, field, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const addRow    = () => setRows((p) => [...p, { id: _nextId++, vendor: "New vendor", spend: 0, risk: 5 }]);
  const removeRow = (id) => setRows((p) => p.filter((r) => r.id !== id));

  const sendToAI = () => {
    const lines = sorted
      .map((r, i) => `${i + 1}. ${r.vendor} — $${fmt(r.spend)}M spend, risk ${r.risk}/10`)
      .join("\n");
    onSendToAI(
      {
        label: `🌐 Supply Chain (${rows.length} vendors)`,
        text:
          `SUPPLY CHAIN CONTEXT — Vendor Spend / Risk Profile\n` +
          `Total spend: $${fmt(total)}M across ${rows.length} vendors.\n` +
          `High-risk vendors (≥7/10): ${highRisk}. ` +
          `Top vendor by spend: ${sorted[0]?.vendor} ($${fmt(sorted[0]?.spend)}M, ${fmt(topShare)}% of total).\n\n` +
          `Vendors sorted by spend:\n${lines}`,
      },
      `Analyze this vendor portfolio. Flag concentration risks (any vendor >30% of spend), ` +
        `identify single-source dependencies, and recommend 3 mitigation actions ranked by impact.`
    );
  };

  return (
    <div className="border-b border-ink-700 bg-ink-950">
      {/* Horizontal bar chart */}
      <div className="h-52 px-2 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={sorted} margin={{ top: 4, right: 20, left: 4, bottom: 0 }}>
            <defs>
              <filter id="scGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 6" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: colors.axis, fontSize: 10, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={{ stroke: colors.grid }}
              tickFormatter={(v) => `$${fmt(v, 0)}M`}
            />
            <YAxis
              type="category"
              dataKey="vendor"
              width={88}
              tick={{ fill: colors.axis, fontSize: 10, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<SCTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="spend" radius={[0, 4, 4, 0]} filter="url(#scGlow)"
              animationDuration={900} animationEasing="ease-out">
              {sorted.map((r) => <Cell key={r.id} fill={riskColor(r.risk)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 px-4 py-2">
        <Stat label="Total spend" value={`$${fmt(total, 0)}M`} />
        <Stat label="Top vendor share" value={`${fmt(topShare, 0)}%`}
          accent={topShare > 30 ? "text-red-400" : "text-ink-100"} />
        <Stat label="High-risk (≥7)" value={highRisk}
          accent={highRisk > 0 ? "text-red-400" : "text-mint-400"} />
      </div>

      {/* Editable table */}
      <div className="overflow-x-auto px-4 pb-1" style={{ maxHeight: 160, overflowY: "auto" }}>
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr className="text-left text-ink-500">
              <th className="pb-1 font-semibold">Vendor</th>
              <th className="pb-1 pr-2 text-right font-semibold">Spend $M</th>
              <th className="pb-1 pr-2 text-right font-semibold">Risk 1–10</th>
              <th className="w-4" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-ink-800">
                <td className="py-0.5 pr-2">
                  <input value={r.vendor}
                    onChange={(e) => update(r.id, "vendor", e.target.value)}
                    className="w-full bg-transparent text-ink-100 focus:outline-none" />
                </td>
                <td className="py-0.5 pr-2 text-right">
                  <input type="number" value={r.spend}
                    onChange={(e) => update(r.id, "spend", Number(e.target.value))}
                    className="w-20 bg-transparent text-right text-mint-400 focus:outline-none" />
                </td>
                <td className="py-0.5 pr-2 text-right">
                  <input type="number" min={1} max={10} value={r.risk}
                    onChange={(e) => update(r.id, "risk", Number(e.target.value))}
                    className="w-12 bg-transparent text-right focus:outline-none"
                    style={{ color: riskColor(r.risk) }} />
                </td>
                <td>
                  <button onClick={() => removeRow(r.id)}
                    className="text-ink-700 hover:text-red-400">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addRow}
          className="mt-1 font-mono text-[10px] text-ink-500 hover:text-ink-300">
          + Add vendor
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <span className="font-mono text-[10px] text-ink-500">
          <span style={{ color: COLOR_LOW }}>■</span> low &nbsp;
          <span style={{ color: COLOR_MED }}>■</span> med &nbsp;
          <span style={{ color: COLOR_HIGH }}>■</span> high risk · edit rows above
        </span>
        <button onClick={sendToAI}
          className="rounded-lg border border-mint-400/40 bg-mint-400/10 px-3 py-1.5 text-xs font-semibold text-mint-400 hover:bg-mint-400/20">
          Send to AI as context →
        </button>
      </div>
    </div>
  );
}
