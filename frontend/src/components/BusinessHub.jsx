import { Link } from "react-router-dom";
import { Search, Briefcase, Coins, ArrowRight } from "lucide-react";
import TopNav from "./TopNav.jsx";
import { Label } from "./ManifestUI.jsx";

const SECTIONS = [
  { to: "/business/research", Icon: Search,    title: "Research",  body: "Look up a company or ticker.",      soon: false },
  { to: null,                 Icon: Briefcase,  title: "Portfolio", body: "Track holdings and performance.",   soon: true },
  { to: null,                 Icon: Coins,      title: "Currency",  body: "FX exposure and conversion tools.", soon: true },
];

export default function BusinessHub() {
  return (
    <div className="flex min-h-full flex-col bg-ink-950 text-ink-100">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-16">
        <div className="fade-rise">
          <Label>QUANTA Business</Label>
          <h1 className="mt-2 font-display text-3xl font-bold">Business toolkit</h1>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {SECTIONS.map(({ to, Icon, title, body, soon }) => {
            const content = (
              <div
                className={`card-raised flex h-full flex-col gap-3 p-5 transition-all duration-300 ${
                  to ? "group-hover:-translate-y-1.5 group-hover:glow-ember" : "opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-600/15 text-ember-600">
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  {soon && <span className="pill-chip text-ember-600">Coming soon</span>}
                </div>
                <h2 className="mt-1 font-display text-base font-bold">{title}</h2>
                <p className="flex-1 font-sans text-sm leading-relaxed text-ink-500">{body}</p>
                {to && (
                  <span className="pill-outline w-fit">
                    Open <ArrowRight size={12} strokeWidth={2.5} />
                  </span>
                )}
              </div>
            );
            return to ? (
              <Link key={title} to={to} className="group block">{content}</Link>
            ) : (
              <div key={title}>{content}</div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
