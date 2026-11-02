import { Link, useLocation } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import useTheme from "../useTheme.js";

const SECTIONS = [
  { prefix: "/ai",       label: "AI",       to: "/ai" },
  { prefix: "/business", label: "Business", to: "/business" },
  { prefix: "/learn",    label: "Learn",    to: "/learn" },
];

/** Shared top nav — pill tabs, ember active state, one login, one toggle. */
export default function TopNav() {
  const { pathname } = useLocation();
  const { session, openModal, signOut } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const user = session?.user;

  return (
    <header className="border-b border-line/8 bg-ink-900/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-3">
        <Link to="/" className="flex items-center gap-2.5 text-ink-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ember-600 font-display text-sm font-bold text-white glow-ember">
            Q
          </div>
          <span className="font-display text-sm font-bold tracking-wide">QUANTA</span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full border border-line/8 bg-ink-950/40 p-1">
          {SECTIONS.map((s) => {
            const active = pathname === s.prefix || pathname.startsWith(`${s.prefix}/`);
            return (
              <Link
                key={s.prefix}
                to={s.to}
                className={`rounded-full px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide transition-all duration-200 ${
                  active
                    ? "bg-ember-600 text-white shadow-[0_4px_14px_-4px_rgba(240,116,31,0.6)]"
                    : "text-ink-500 hover:text-ink-100"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="focus-glow flex h-8 w-8 items-center justify-center rounded-full border border-line/10 text-ink-500 transition-colors hover:text-ink-100"
          >
            {theme === "dark" ? <Sun size={14} strokeWidth={2} /> : <Moon size={14} strokeWidth={2} />}
          </button>

          {user ? (
            <>
              <span className="hidden max-w-[160px] truncate font-mono text-[11px] text-ink-500 sm:block">
                {user.email}
              </span>
              <button onClick={signOut} className="pill-outline">
                Sign out
              </button>
            </>
          ) : (
            <button onClick={openModal} className="pill-ember focus-glow">
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
