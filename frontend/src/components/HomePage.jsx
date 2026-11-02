import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Briefcase, GraduationCap, ArrowRight } from "lucide-react";
import TopNav from "./TopNav.jsx";
import TickerStrip from "./TickerStrip.jsx";
import PulseLine from "./PulseLine.jsx";
import { Label, ChangePill, fmtPrice } from "./ManifestUI.jsx";
import { fetchQuotes, fetchSparkline } from "../api.js";
import usePriceFlash from "../usePriceFlash.js";

const MOVER_TICKERS = ["AAPL", "NVDA", "MSFT", "BTC-USD", "^GSPC"];
const NVDA_SAMPLE_SPARK = [142, 140.5, 138, 136.5, 133, 131, 128.5];

// Faint ember-tinted candlestick silhouette behind the hero headline.
function HeroChartMotif() {
  return (
    <svg
      viewBox="0 0 800 280"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full animate-glow-pulse opacity-[0.1]"
    >
      {Array.from({ length: 28 }).map((_, i) => {
        const x = 20 + i * 28;
        const h = 30 + Math.abs(Math.sin(i * 0.7)) * 90;
        const y = 140 - h / 2 + Math.sin(i * 0.4) * 30;
        return <rect key={i} x={x} y={y} width="10" height={h} fill="#F0741F" />;
      })}
      <path
        d="M0,180 C80,140 140,190 220,120 C300,60 360,150 440,100 C520,55 580,130 660,80 C720,45 760,90 800,60"
        fill="none"
        stroke="#F0741F"
        strokeWidth="2.5"
        strokeDasharray="6 5"
      />
    </svg>
  );
}

function HeroPreviewCard() {
  return (
    <div className="card-raised fade-rise w-full max-w-sm shrink-0 p-5" style={{ animationDelay: "280ms" }}>
      <Label>Sample question</Label>
      <p className="mt-1.5 font-sans text-sm font-medium text-ink-100">
        "Why did NVDA drop 4% today?"
      </p>
      <div className="mt-3 rounded-xl bg-ink-950/50 p-3">
        <p className="font-sans text-xs leading-relaxed text-ink-300">
          NVDA slid on renewed export-restriction concerns that weighed on semiconductor
          names broadly, with volume running well above the 30-day average.
        </p>
      </div>
      <div className="mt-3">
        <PulseLine data={NVDA_SAMPLE_SPARK} variant="down" width={280} height={52} glow animate />
      </div>
      <div className="mt-3 flex gap-2">
        <span className="pill-chip">Reuters</span>
        <span className="pill-chip">Bloomberg</span>
      </div>
    </div>
  );
}

function AiCardPreview() {
  return (
    <div className="mt-3 space-y-1.5">
      <div className="ml-auto max-w-[75%] rounded-xl rounded-br-sm bg-ember-600/15 px-2.5 py-1.5 text-right font-sans text-[11px] text-ink-100">
        Why is BTC up today?
      </div>
      <div className="max-w-[80%] rounded-xl rounded-bl-sm bg-ink-950/50 px-2.5 py-1.5 font-sans text-[11px] text-ink-300">
        ETF inflows accelerated after... <span className="text-ember-600">[Reuters]</span>
      </div>
    </div>
  );
}

function BusinessCardPreview({ quote }) {
  return (
    <div className="mt-3">
      <PulseLine data={[1, 1.01, 0.995, 1.015, 1.02, 1.03].map((m) => (quote?.price || 100) * m)} width={200} height={36} glow={false} />
      <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[10px] text-ink-500">
        <div><div className="text-ink-100">{quote ? fmtPrice(quote.price) : "—"}</div>Price</div>
        <div><div className={quote?.change_pct > 0 ? "text-up" : "text-down"}>{quote ? `${quote.change_pct?.toFixed(1)}%` : "—"}</div>Change</div>
        <div><div className="text-ink-100">{quote ? fmtPrice(quote.prev_close) : "—"}</div>Prev</div>
      </div>
    </div>
  );
}

function LearnCardPreview() {
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-2 font-sans text-[11px] text-ink-300">
        <span className="h-1.5 w-1.5 rounded-full bg-up" /> What Is a Stock?
      </div>
      <div className="flex items-center gap-2 font-sans text-[11px] text-ink-500">
        <span className="h-1.5 w-1.5 rounded-full bg-line/20" /> Reading a Price Chart
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-line/8">
        <div className="h-full w-1/4 rounded-full bg-ember-600" />
      </div>
    </div>
  );
}

function MoverCard({ ticker, quote, spark }) {
  const flash = usePriceFlash(quote?.price);
  return (
    <div className="card p-4">
      <div className="font-mono text-xs font-bold uppercase tracking-wide text-ink-500">{ticker}</div>
      <div className={`mt-1 rounded px-1 font-mono text-lg font-bold tabular-nums ${flash}`}>
        {quote ? fmtPrice(quote.price) : "—"}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        {quote ? <ChangePill value={quote.change_pct} /> : <span className="font-mono text-[11px] text-ink-700">—</span>}
      </div>
      {spark?.length > 1 && (
        <div className="mt-2">
          <PulseLine data={spark} width={140} height={28} glow={false} />
        </div>
      )}
    </div>
  );
}

const CARDS = [
  { to: "/ai",       Icon: Bot,            title: "QUANTA AI",       body: "A research agent with live prices, market history, and the web.",      preview: "ai" },
  { to: "/business", Icon: Briefcase,      title: "QUANTA Business", body: "Company and ticker research — chart, stats, news, AI brief.",          preview: "business" },
  { to: "/learn",    Icon: GraduationCap,  title: "QUANTA Learn",    body: "Short, plain-language lessons on how markets work.",                     preview: "learn" },
];

export default function HomePage() {
  const [moverQuotes, setMoverQuotes] = useState({});
  const [moverSparks, setMoverSparks] = useState({});

  useEffect(() => {
    let active = true;
    fetchQuotes(MOVER_TICKERS).then(({ quotes }) => { if (active) setMoverQuotes(quotes || {}); }).catch(() => {});
    Promise.all(MOVER_TICKERS.map(async (t) => [t, await fetchSparkline(t, "5d")]))
      .then((entries) => { if (active) setMoverSparks(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, []);

  const movers = MOVER_TICKERS
    .map((t) => ({ ticker: t, quote: moverQuotes[t], spark: moverSparks[t] }))
    .filter((m) => m.quote)
    .sort((a, b) => Math.abs(b.quote.change_pct ?? 0) - Math.abs(a.quote.change_pct ?? 0));

  return (
    <div className="flex min-h-full flex-col bg-ink-950 text-ink-100">
      <TopNav />
      <TickerStrip />

      <section className="relative overflow-hidden px-5 py-20 sm:py-28">
        <HeroChartMotif />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember-600/20 blur-[100px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="fade-rise mb-4 inline-flex items-center gap-2 rounded-full border border-line/10 bg-ink-900/60 px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-600 opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember-600" />
              </span>
              <Label className="text-ink-300">Live markets</Label>
            </div>

            <h1 className="fade-rise font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl" style={{ animationDelay: "80ms" }}>
              Markets,
              <br />
              explained.
            </h1>
            <p className="fade-rise mt-4 max-w-lg font-sans text-base leading-relaxed text-ink-500" style={{ animationDelay: "160ms" }}>
              One app, three ways in: an AI that researches markets with you, a business
              toolkit for company and currency analysis, and lessons that explain how it
              all works.
            </p>
          </div>

          <div className="fade-rise w-full lg:w-auto" style={{ animationDelay: "240ms" }}>
            <HeroPreviewCard />
          </div>
        </div>
      </section>

      <section className="px-5 pb-16">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
          {CARDS.map(({ to, Icon, title, body, soon, preview }) => (
            <Link key={to} to={to} className="group block">
              <div className="card-raised flex h-full flex-col gap-1 p-5 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:glow-ember">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-600/15 text-ember-600">
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  {soon && <span className="pill-chip text-ember-600">Coming soon</span>}
                </div>
                <h2 className="mt-3 font-display text-base font-bold">{title}</h2>
                <p className="font-sans text-sm leading-relaxed text-ink-500">{body}</p>

                {preview === "ai" && <AiCardPreview />}
                {preview === "business" && <BusinessCardPreview quote={moverQuotes.AAPL} />}
                {preview === "learn" && <LearnCardPreview />}

                <span className="pill-outline mt-4 w-fit">
                  Open <ArrowRight size={12} strokeWidth={2.5} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="mx-auto max-w-6xl">
          <Label>Today's movers</Label>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(movers.length ? movers : MOVER_TICKERS.map((t) => ({ ticker: t, quote: null, spark: null }))).map((m) => (
              <MoverCard key={m.ticker} {...m} />
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line/8 py-6 text-center font-mono text-[10px] uppercase tracking-widest text-ink-700">
        © 2026 QUANTA
      </footer>
    </div>
  );
}
