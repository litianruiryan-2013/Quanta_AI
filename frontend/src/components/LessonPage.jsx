import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import TopNav from "./TopNav.jsx";
import PulseLine from "./PulseLine.jsx";
import { Label, fmtCompact } from "./ManifestUI.jsx";
import { LESSONS, getLesson } from "../lessons.js";
import useLearnProgress from "../useLearnProgress.js";
import { fetchCompany } from "../api.js";

const UP_SAMPLE = [100, 102, 101, 105, 108, 112, 118];
const DOWN_SAMPLE = [118, 115, 109, 110, 104, 100, 96];

function PriceChartDemo() {
  return (
    <div className="card-raised p-5">
      <Label>Live example</Label>
      <div className="mt-3 flex flex-wrap gap-6">
        <div>
          <div className="mb-1.5 font-mono text-[11px] text-up">Uptrend</div>
          <PulseLine data={UP_SAMPLE} variant="up" width={160} height={44} glow />
        </div>
        <div>
          <div className="mb-1.5 font-mono text-[11px] text-down">Downtrend</div>
          <PulseLine data={DOWN_SAMPLE} variant="down" width={160} height={44} glow />
        </div>
      </div>
    </div>
  );
}

function CompanyStatDemo({ ticker, label, pick }) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    let active = true;
    fetchCompany(ticker).then((d) => { if (active) setValue(pick(d)); }).catch(() => {});
    return () => { active = false; };
  }, [ticker, pick]);

  return (
    <div className="card-raised p-5">
      <Label>Live example</Label>
      <p className="mt-2 font-sans text-sm text-ink-300">
        Right now, <span className="font-mono font-bold text-ink-100">{ticker}</span> {label}
      </p>
      <div className="mt-1 font-mono text-2xl font-bold text-ember-500">{value ?? "…"}</div>
    </div>
  );
}

const DEMOS = {
  "reading-a-price-chart": () => <PriceChartDemo />,
  "pe-ratio": () => (
    <CompanyStatDemo ticker="AAPL" label="trades at a P/E of" pick={(d) => d.pe_ratio?.toFixed(1) ?? "n/a"} />
  ),
  "market-cap": () => (
    <CompanyStatDemo ticker="AAPL" label="has a market cap of" pick={(d) => `$${fmtCompact(d.market_cap)}`} />
  ),
};

export default function LessonPage() {
  const { slug } = useParams();
  const lesson = getLesson(slug);
  const { isComplete, markComplete } = useLearnProgress();

  if (!lesson) return <Navigate to="/learn" replace />;

  const idx = LESSONS.findIndex((l) => l.slug === slug);
  const prev = LESSONS[idx - 1];
  const next = LESSONS[idx + 1];
  const Demo = DEMOS[slug];
  const done = isComplete(slug);

  return (
    <div className="flex min-h-full flex-col bg-ink-950 text-ink-100">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <Link to="/learn" className="fade-rise inline-flex items-center gap-1.5 font-mono text-xs text-ink-500 hover:text-ink-100">
          <ArrowLeft size={13} strokeWidth={2} /> All lessons
        </Link>

        <div className="fade-rise mt-4" style={{ animationDelay: "60ms" }}>
          <Label>{lesson.readTime} read</Label>
          <h1 className="mt-2 font-display text-3xl font-bold">{lesson.title}</h1>
        </div>

        <article className="markdown-body fade-rise mt-6 space-y-3 font-sans text-sm leading-relaxed text-ink-300" style={{ animationDelay: "120ms" }}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="my-2">{children}</p>,
              h2: ({ children }) => <h2 className="mt-6 font-display text-lg font-bold text-ink-100">{children}</h2>,
              ul: ({ children }) => <ul className="my-2 list-disc space-y-1.5 pl-5">{children}</ul>,
              li: ({ children }) => <li>{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-ink-100">{children}</strong>,
              a: ({ children, href }) => (
                <Link to={href} className="text-ember-500 underline hover:text-ember-600">{children}</Link>
              ),
            }}
          >
            {lesson.body}
          </ReactMarkdown>
        </article>

        {Demo && <div className="mt-6"><Demo /></div>}

        <button
          onClick={() => markComplete(slug)}
          disabled={done}
          className={`mt-8 pill ${done ? "bg-up/15 text-up" : "pill-ember focus-glow"}`}
        >
          {done ? <><Check size={13} strokeWidth={2.5} /> Completed</> : "Mark as complete"}
        </button>

        <div className="mt-10 flex items-center justify-between border-t border-dashed border-line/12 pt-5">
          {prev ? (
            <Link to={`/learn/${prev.slug}`} className="font-mono text-xs text-ink-500 hover:text-ink-100">
              <ArrowLeft size={12} strokeWidth={2} className="mr-1 inline" /> {prev.title}
            </Link>
          ) : <span />}
          {next ? (
            <Link to={`/learn/${next.slug}`} className="font-mono text-xs text-ink-500 hover:text-ink-100">
              {next.title} <ArrowRight size={12} strokeWidth={2} className="ml-1 inline" />
            </Link>
          ) : <span />}
        </div>
      </main>
    </div>
  );
}
