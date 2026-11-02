import { Link } from "react-router-dom";
import { Layers, PieChart, Calculator, LineChart, Coins, BarChart3, Shield, Repeat, Check, ArrowRight } from "lucide-react";
import TopNav from "./TopNav.jsx";
import { Label } from "./ManifestUI.jsx";
import { CATEGORIES, getLessonsByCategory, LESSONS } from "../lessons.js";
import useLearnProgress from "../useLearnProgress.js";

const ICONS = { Layers, PieChart, Calculator, LineChart, Coins, BarChart3, Shield, Repeat };

function LessonCard({ lesson, done }) {
  const Icon = ICONS[lesson.icon] || Layers;
  return (
    <Link to={`/learn/${lesson.slug}`} className="group block">
      <div className="card-raised flex h-full flex-col gap-3 p-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:glow-ember">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-600/15 text-ember-600">
            <Icon size={18} strokeWidth={1.75} />
          </div>
          {done && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-up/15 text-up">
              <Check size={13} strokeWidth={2.5} />
            </div>
          )}
        </div>
        <h3 className="mt-1 font-display text-base font-bold">{lesson.title}</h3>
        <p className="flex-1 font-sans text-sm leading-relaxed text-ink-500">{lesson.summary}</p>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink-700">{lesson.readTime} read</span>
          <span className="pill-outline">
            {done ? "Review" : "Start"} <ArrowRight size={12} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function LearnHub() {
  const { isComplete, completed } = useLearnProgress();
  const progressPct = (completed.size / LESSONS.length) * 100;

  return (
    <div className="flex min-h-full flex-col bg-ink-950 text-ink-100">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <div className="fade-rise flex flex-wrap items-end justify-between gap-4">
          <div>
            <Label>QUANTA Learn</Label>
            <h1 className="mt-2 font-display text-3xl font-bold">Markets, explained.</h1>
            <p className="mt-1 max-w-md font-sans text-sm text-ink-500">
              Short, plain-language lessons on how markets actually work — no jargon, no sales pitch.
            </p>
          </div>
          <div className="card px-4 py-3 text-right">
            <Label>Progress</Label>
            <div className="mt-1 font-mono text-lg font-bold">{completed.size}/{LESSONS.length}</div>
            <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-line/8">
              <div className="h-full rounded-full bg-ember-600 transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-10">
          {CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <Label>{cat.label}</Label>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                {getLessonsByCategory(cat.id).map((lesson) => (
                  <LessonCard key={lesson.slug} lesson={lesson} done={isComplete(lesson.slug)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
