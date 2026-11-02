import { useEffect, useState } from "react";
import { fetchQuotes, fetchSparkline } from "../api.js";
import { fmtPrice } from "./ManifestUI.jsx";
import PulseLine from "./PulseLine.jsx";
import usePriceFlash from "../usePriceFlash.js";

// Broader than FX alone — indices, commodities, crypto, FX, and a couple of
// bellwether names, so the strip reads as "markets" rather than one asset class.
const SYMBOLS = [
  { symbol: "^GSPC",     label: "S&P 500",   digits: 2 },
  { symbol: "^IXIC",     label: "NASDAQ",    digits: 2 },
  { symbol: "^DJI",      label: "DOW",       digits: 2 },
  { symbol: "^STI",      label: "STI",       digits: 2 },
  { symbol: "^N225",     label: "NIKKEI",    digits: 2 },
  { symbol: "^FTSE",     label: "FTSE 100",  digits: 2 },
  { symbol: "USDSGD=X",  label: "USD/SGD",   digits: 4 },
  { symbol: "EURUSD=X",  label: "EUR/USD",   digits: 4 },
  { symbol: "GC=F",      label: "GOLD",      digits: 2 },
  { symbol: "CL=F",      label: "WTI CRUDE", digits: 2 },
  { symbol: "BTC-USD",   label: "BTC",       digits: 0 },
  { symbol: "ETH-USD",   label: "ETH",       digits: 0 },
  { symbol: "AAPL",      label: "AAPL",      digits: 2 },
  { symbol: "NVDA",      label: "NVDA",      digits: 2 },
  { symbol: "MSFT",      label: "MSFT",      digits: 2 },
  { symbol: "TSLA",      label: "TSLA",      digits: 2 },
];

const POLL_MS = 30_000;
const SECONDS_PER_ITEM = 3.6;

function TickerItem({ label, digits, quote, spark }) {
  const pct = quote?.change_pct;
  const up = pct > 0;
  const down = pct < 0;
  const colorClass = up ? "text-up" : down ? "text-down" : "text-ink-500";
  const arrow = up ? "▲" : down ? "▼" : "•";
  const chg = quote?.change;
  const sign = chg > 0 ? "+" : "";
  const flash = usePriceFlash(quote?.price);

  return (
    <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap px-6 font-mono">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${up ? "bg-up" : down ? "bg-down" : "bg-ink-500"}`} />
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{label}</span>
      <span className={`rounded px-1 text-[14px] font-bold text-ink-100 ${flash}`}>{quote ? fmtPrice(quote.price, { digits }) : "—"}</span>
      {quote && (
        <span className={`flex items-center gap-1 text-[12px] font-bold ${colorClass}`}>
          <span>{arrow}</span>
          <span>{sign}{fmtPrice(chg, { digits })}</span>
          <span className="opacity-80">({sign}{pct.toFixed(2)}%)</span>
        </span>
      )}
      {spark?.length > 1 && (
        <PulseLine data={spark} variant={up ? "up" : down ? "down" : "ember"} width={44} height={18} strokeWidth={1.5} glow={false} animate={false} />
      )}
      <span className="ml-1.5 text-ink-700/40">│</span>
    </div>
  );
}

export default function TickerStrip() {
  const [quotes, setQuotes] = useState({});
  const [sparks, setSparks] = useState({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { quotes: q } = await fetchQuotes(SYMBOLS.map((s) => s.symbol));
        if (active) setQuotes(q || {});
      } catch {
        // silent — ticker strip degrades to "—" rather than erroring the page
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, []);

  // Sparkline history is fetched once (doesn't need to refresh on the same
  // cadence as live price) to keep this cheap.
  useEffect(() => {
    let active = true;
    (async () => {
      const entries = await Promise.all(
        SYMBOLS.map(async (s) => [s.symbol, await fetchSparkline(s.symbol, "5d")])
      );
      if (active) setSparks(Object.fromEntries(entries));
    })();
    return () => { active = false; };
  }, []);

  const row = (keyPrefix) => (
    <div className="flex shrink-0 items-center">
      {SYMBOLS.map((s) => (
        <TickerItem key={`${keyPrefix}-${s.symbol}`} {...s} quote={quotes[s.symbol]} spark={sparks[s.symbol]} />
      ))}
    </div>
  );

  return (
    <div className="relative overflow-hidden border-b border-line/8 bg-ink-950 py-3">
      <style>{`
        @keyframes quanta-ticker-scroll {
          from { transform: translateX(0%); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to right, rgb(var(--ink-950)) 0%, transparent 6%, transparent 94%, rgb(var(--ink-950)) 100%)",
        }}
      />

      <div
        className="flex w-max items-center"
        style={{ animation: `quanta-ticker-scroll ${SYMBOLS.length * SECONDS_PER_ITEM}s linear infinite` }}
        onMouseEnter={(e) => { e.currentTarget.style.animationPlayState = "paused"; }}
        onMouseLeave={(e) => { e.currentTarget.style.animationPlayState = "running"; }}
      >
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
