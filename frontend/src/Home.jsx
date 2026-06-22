import { motion, useReducedMotion } from "framer-motion";
import { Activity, Brain, LineChart } from "lucide-react";

const CARDS = [
  {
    Icon: Brain,
    title: "Strategy AI",
    body: "Chat with your local LLM about any dataset, codebase, or trading thesis. Runs fully offline — your data never leaves your machine.",
    iconBg: "bg-ember-500/10",
    iconText: "text-ember-500",
    borderHover: "hover:border-ember-500/40",
    shadowHover: "hover:shadow-ember-glow",
  },
  {
    Icon: LineChart,
    title: "Market Charts",
    body: "Live ticker lookup with interactive candlestick and comparison charts. Powered by yFinance, streamed from your local backend.",
    iconBg: "bg-sky-400/10",
    iconText: "text-sky-400",
    borderHover: "hover:border-sky-400/40",
    shadowHover: "hover:shadow-sky-glow",
  },
  {
    Icon: Activity,
    title: "Paper-Trading Simulator",
    body: "Backtest buy, hold, and sell strategies against real historical data. See P&L before risking real capital.",
    iconBg: "bg-mint-400/10",
    iconText: "text-mint-400",
    borderHover: "hover:border-mint-400/40",
    shadowHover: "hover:shadow-mint-glow",
  },
];

const CHART_LINE = "M 0,62 C 25,57 45,54 70,48 C 95,42 112,50 138,40 C 162,30 177,35 202,23 C 222,14 247,17 280,5";
const CHART_AREA = `${CHART_LINE} L 280,70 L 0,70 Z`;

const ease = [0.16, 1, 0.3, 1];

export default function Home({ onLaunch, theme, onToggleTheme }) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="flex min-h-full flex-col bg-ink-950 text-ink-100">
      {/* Nav */}
      <header className="flex items-center gap-3 border-b border-ink-700 bg-ink-900 px-6 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ember-600 font-mono text-sm font-bold text-ink-950">
          Q
        </div>
        <span className="font-mono text-sm font-bold tracking-[0.2em] text-ink-100">QUANTA</span>
        <motion.button
          onClick={onToggleTheme}
          aria-label="Toggle color theme"
          whileHover={shouldReduce ? {} : { scale: 1.05 }}
          whileTap={shouldReduce ? {} : { scale: 0.95 }}
          className="ml-auto rounded-lg border border-ink-700 px-2.5 py-1 text-xs text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </motion.button>
      </header>

      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
        {/* Drifting glow blobs */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="animate-glow-drift absolute h-80 w-80 rounded-full bg-ember-500/25 blur-[90px]"
            style={{ willChange: "transform" }}
          />
          <div
            className="animate-glow-drift2 absolute h-64 w-64 rounded-full bg-mint-400/20 blur-[80px]"
            style={{ animationDelay: "-2s", willChange: "transform" }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-5">
          {/* Letter-by-letter wordmark reveal */}
          <h1
            className="flex font-mono font-bold leading-none tracking-[0.12em] text-ink-100"
            style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)" }}
            aria-label="QUANTA"
          >
            {"QUANTA".split("").map((letter, i) => (
              <span
                key={i}
                className="inline-block animate-wordmark-reveal"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {letter}
              </span>
            ))}
          </h1>

          <p
            className="animate-fade-up font-mono text-xs font-semibold tracking-[0.3em] text-ember-500"
            style={{ animationDelay: "80ms" }}
          >
            LOCAL AI · REAL MARKETS · ZERO RISK
          </p>

          {/* Self-drawing stock chart */}
          <div
            className="animate-fade-up w-full max-w-xs"
            style={{ animationDelay: "220ms" }}
          >
            <svg viewBox="0 0 280 70" fill="none" aria-hidden="true" className="w-full" preserveAspectRatio="none">
              <path className="chart-area" d={CHART_AREA} fill="rgba(255,138,61,0.08)" />
              <path
                className="chart-line"
                d={CHART_LINE}
                stroke="rgba(255,138,61,0.75)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p
            className="animate-fade-up max-w-sm text-sm leading-relaxed text-ink-300"
            style={{ animationDelay: "360ms" }}
          >
            Your offline-first financial intelligence platform. Chat with AI, analyze live
            markets, and backtest trades — all from your machine.
          </p>

          <motion.button
            onClick={onLaunch}
            whileHover={shouldReduce ? {} : { scale: 1.04, y: -3 }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
            transition={{ duration: 0.2, ease }}
            className="animate-fade-up mt-2 rounded-xl bg-ember-600 px-8 py-3 font-mono text-sm font-bold text-ink-950 hover:bg-ember-500 hover:shadow-ember-glow"
            style={{ animationDelay: "500ms" }}
          >
            Launch app →
          </motion.button>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-6 pb-16">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              whileHover={shouldReduce ? {} : { y: -6 }}
              whileTap={shouldReduce ? {} : { scale: 0.98 }}
              transition={{ duration: 0.22, ease }}
              className={`animate-fade-up rounded-xl border border-ink-700 bg-ink-900 p-6 transition-colors duration-300 ${card.borderHover} ${card.shadowHover}`}
              style={{ animationDelay: `${620 + i * 100}ms` }}
            >
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${card.iconBg}`}>
                <card.Icon size={18} strokeWidth={1.75} className={card.iconText} />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-ink-100">{card.title}</h3>
              <p className="text-xs leading-relaxed text-ink-300">{card.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-700 py-5 text-center font-mono text-[10px] tracking-widest text-ink-500">
        © 2025 QUANTA · offline-first · free
      </footer>
    </div>
  );
}
