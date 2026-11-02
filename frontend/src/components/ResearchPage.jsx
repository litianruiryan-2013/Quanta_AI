import { useEffect, useState } from "react";
import { Search, Sparkles, ExternalLink } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import TopNav from "./TopNav.jsx";
import AiMessage from "./AiMessage.jsx";
import { Label, fmtPrice, fmtCompact } from "./ManifestUI.jsx";
import { fetchCompany, fetchMarketData, sendAgentChat } from "../api.js";

const PERIODS = [
  { value: "5d",  label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "ytd", label: "YTD" },
  { value: "1y",  label: "1Y" },
  { value: "5y",  label: "5Y" },
  { value: "max", label: "MAX" },
];

function getChartColors() {
  if (typeof window === "undefined") return { grid: "rgba(255,255,255,0.06)", axis: "#9A9AA3" };
  const cs = getComputedStyle(document.documentElement);
  const raw = (name, fallback) => {
    const v = cs.getPropertyValue(name).trim();
    return v ? `rgb(${v})` : fallback;
  };
  return { grid: raw("--chart-grid", "rgba(255,255,255,0.06)"), axis: raw("--chart-axis", "#9A9AA3") };
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 font-mono text-[11px]">
      <div className="text-ink-500">{label}</div>
      <div className="font-semibold text-ember-500">{fmtPrice(payload[0].value)}</div>
    </div>
  );
}

/** Price chart with its own period selector — decoupled from the 10-min
 * company-stats cache so switching periods never re-fetches stats/news. */
function PriceChart({ ticker }) {
  const [period, setPeriod] = useState("6mo");
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const { grid, axis } = getChartColors();

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchMarketData(ticker, period, "1d")
      .then((d) => { if (active) setPoints(d.points || []); })
      .catch(() => { if (active) setPoints([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ticker, period]);

  return (
    <div className="card-raised p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Price history</Label>
        <div className="flex gap-1 rounded-full border border-line/8 bg-ink-950/40 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                period === p.value ? "bg-ember-600 text-white" : "text-ink-500 hover:text-ink-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 h-64">
        {loading ? (
          <div className="flex h-full items-center justify-center font-mono text-xs text-ink-500">Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <defs>
                <linearGradient id="researchEmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F0741F" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#F0741F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: axis, fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis tick={{ fill: axis, fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={56} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="close" stroke="#F0741F" strokeWidth={2} fill="url(#researchEmber)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="card p-3.5">
      <Label>{label}</Label>
      <div className="mt-1 font-mono text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState(null);

  const runSearch = async (e) => {
    e.preventDefault();
    const ticker = query.trim().toUpperCase();
    if (!ticker) return;
    setLoading(true);
    setError(null);
    setBrief(null);
    setBriefError(null);
    try {
      setData(await fetchCompany(ticker));
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const generateBrief = async () => {
    if (!data) return;
    setBriefLoading(true);
    setBriefError(null);
    const prompt =
      `Write a one-page analysis of ${data.name} (${data.ticker}). ` +
      `Current price ${fmtPrice(data.price)} ${data.currency || ""}, market cap ${fmtCompact(data.market_cap)}, ` +
      `P/E ${data.pe_ratio?.toFixed(1) ?? "n/a"}, 52-week range ${fmtPrice(data.fifty_two_week_low)}-${fmtPrice(data.fifty_two_week_high)}, ` +
      `sector ${data.sector || "n/a"}. Use market history and web search for recent news and catalysts, ` +
      `and cite your sources with URLs.`;
    try {
      const result = await sendAgentChat({ messages: [{ role: "user", content: prompt }] });
      setBrief(result.content);
    } catch (err) {
      setBriefError(err.message);
    } finally {
      setBriefLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-ink-950 text-ink-100">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <div className="fade-rise">
          <Label>QUANTA Business</Label>
          <h1 className="mt-2 font-display text-3xl font-bold">Research</h1>
          <p className="mt-1 font-sans text-sm text-ink-500">Look up a company or ticker.</p>

          <form onSubmit={runSearch} className="mt-5 flex max-w-md items-center gap-2">
            <div className="focus-glow flex flex-1 items-center gap-2 rounded-xl border border-line/10 bg-ink-900 px-3.5 py-2.5">
              <Search size={15} strokeWidth={2} className="text-ink-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. AAPL, TSLA, NVDA"
                className="w-full bg-transparent font-mono text-sm uppercase text-ink-100 outline-none placeholder:text-ink-700 placeholder:normal-case"
              />
            </div>
            <button type="submit" disabled={!query.trim() || loading} className="pill-ember shrink-0">
              {loading ? "Loading…" : "Search"}
            </button>
          </form>
        </div>

        {error && (
          <div className="card mt-6 border-down/30 px-4 py-3 font-mono text-sm text-down">{error}</div>
        )}

        {data && (
          <div className="fade-rise mt-8 flex flex-col gap-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="font-display text-2xl font-bold">{data.name}</h2>
                <p className="font-mono text-xs uppercase tracking-wide text-ink-500">{data.ticker} · {data.sector || "—"}</p>
              </div>
              <div className="font-mono text-3xl font-bold tabular-nums">
                {fmtPrice(data.price)} <span className="text-base text-ink-500">{data.currency}</span>
              </div>
            </div>

            <PriceChart ticker={data.ticker} />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatTile label="Market Cap" value={fmtCompact(data.market_cap)} />
              <StatTile label="P/E Ratio" value={data.pe_ratio?.toFixed(2) ?? "—"} />
              <StatTile label="52-Week Range" value={`${fmtPrice(data.fifty_two_week_low)}–${fmtPrice(data.fifty_two_week_high)}`} />
              <StatTile label="Revenue" value={fmtCompact(data.revenue)} />
              <StatTile label="Sector" value={data.sector || "—"} />
            </div>

            <div>
              <Label>Latest news</Label>
              <div className="mt-3 flex flex-col gap-2">
                {data.news.length === 0 ? (
                  <p className="font-mono text-[11px] text-ink-500">No recent news found.</p>
                ) : (
                  data.news.map((n) => (
                    <a key={n.url} href={n.url} target="_blank" rel="noreferrer" className="card group flex items-start gap-3 p-3.5 transition-colors hover:border-ember-600/40">
                      <ExternalLink size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-500 group-hover:text-ember-500" />
                      <div className="min-w-0">
                        <div className="font-sans text-sm font-medium text-ink-100">{n.title}</div>
                        {n.content && <div className="mt-0.5 line-clamp-2 font-sans text-xs text-ink-500">{n.content}</div>}
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>

            <div>
              {!brief && (
                <button onClick={generateBrief} disabled={briefLoading} className="pill-ember focus-glow">
                  <Sparkles size={13} strokeWidth={2} />
                  {briefLoading ? "Writing brief…" : "Generate brief"}
                </button>
              )}
              {briefError && <p className="mt-2 font-mono text-xs text-down">{briefError}</p>}
              {brief && (
                <div className="mt-3">
                  <Label>AI brief</Label>
                  <div className="mt-2">
                    <AiMessage role="assistant" content={brief} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
