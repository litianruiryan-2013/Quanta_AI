import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

const TABS = [
  { slug: "dashboard", label: "Dashboard" },
  { slug: "payables",  label: "Payables" },
];

/** Shared chrome for the QUANTA Business ("shipping manifest") pages. */
export default function ManifestShell({ active, demoMode, onExitDemo, children }) {
  const { pathname } = useLocation();
  const { session, openModal, signOut } = useAuth();
  const user = session?.user;

  return (
    <div className="min-h-full bg-manifest-bg text-manifest-ink">
      <header className="border-b-[1.5px] border-manifest-ink bg-manifest-panel">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-5 py-3">
          <Link to="/business/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center border-[1.5px] border-manifest-ink bg-manifest-ink font-mono text-sm font-bold text-manifest-panel">
              Q
            </div>
            <div className="leading-tight">
              <div className="font-mono text-sm font-bold tracking-[0.14em]">QUANTA BUSINESS</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-manifest-muted">
                Import Payables &amp; FX Exposure
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {TABS.map((t) => {
              const isActive = active === t.slug;
              return (
                <Link
                  key={t.slug}
                  to={`/business/${t.slug}`}
                  className={`border-[1.5px] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                    isActive
                      ? "border-manifest-ink bg-manifest-ink text-manifest-panel"
                      : "border-transparent text-manifest-muted hover:border-manifest-dash hover:text-manifest-ink"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden max-w-[160px] truncate font-mono text-[11px] text-manifest-muted sm:block">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="border-[1.5px] border-manifest-ink px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide hover:bg-manifest-ink hover:text-manifest-panel"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={openModal}
                className="border-[1.5px] border-manifest-ink bg-manifest-ink px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-manifest-panel hover:opacity-85"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {demoMode && (
        <div className="border-b-[1.5px] border-dashed border-manifest-dash bg-manifest-bg px-5 py-2">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-manifest-rust">
              Demo data
            </span>
            <span className="font-mono text-[11px] text-manifest-muted">
              Sample importer, 6 invoices, live FX rates. Sign in to track your own.
            </span>
            {user && onExitDemo && (
              <button
                onClick={onExitDemo}
                className="ml-auto font-mono text-[11px] font-semibold uppercase tracking-wide text-manifest-ink underline"
              >
                Switch to my data
              </button>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-5 py-6">{children}</main>
    </div>
  );
}
