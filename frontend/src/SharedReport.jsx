import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./components/CodeBlock.jsx";
import QuantaLoader from "./components/QuantaLoader.jsx";
import { getReport } from "./api.js";

const MD_COMPONENTS = {
  code({ inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const text = String(children).replace(/\n$/, "");
    if (inline || (!match && !text.includes("\n"))) {
      return (
        <code
          className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[12px] text-ember-500"
          {...props}
        >
          {children}
        </code>
      );
    }
    return <CodeBlock language={match?.[1]} value={text} />;
  },
  p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h1 className="mt-6 mb-2 text-xl font-bold text-ink-100">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-5 mb-2 text-lg font-semibold text-ink-100">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-4 mb-1 text-base font-semibold text-ink-100">{children}</h3>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-ember-500 underline">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-ember-500/50 pl-4 text-ink-300 italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-ink-700">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-ink-800 text-ink-300">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-ink-700">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-4 py-2 text-ink-100">{children}</td>,
  hr: () => <hr className="my-6 border-ink-700" />,
  strong: ({ children }) => <strong className="font-semibold text-ink-100">{children}</strong>,
};

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function SharedReport() {
  const { id } = useParams();
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getReport(id)
      .then((data) => { if (active) { setReport(data); setLoading(false); } })
      .catch((err) => { if (active) { setError(err.message); setLoading(false); } });
    return () => { active = false; };
  }, [id]);

  return (
    <div className="min-h-full bg-ink-950 text-ink-100">
      {/* Top bar — CTA + branding */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-700 bg-ink-900/95 px-5 py-3 backdrop-blur">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ember-600 font-mono text-sm font-bold text-ink-950">
            Q
          </div>
          <span className="font-mono text-sm font-bold tracking-[0.15em] text-ink-100">QUANTA</span>
        </Link>

        <div className="flex-1" />

        <div className="relative flex items-center">
          <span
            aria-hidden
            className="animate-glow-pulse pointer-events-none absolute inset-0 rounded-lg bg-ember-500/35 blur-md"
          />
          <Link
            to="/"
            className="relative rounded-lg bg-ember-600 px-4 py-1.5 font-mono text-xs font-bold text-ink-950 shadow-ember-glow transition-colors hover:bg-ember-500"
          >
            Analyze Your Own Business with QUANTA — Free
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-3xl px-5 py-12">
        {loading && (
          <div className="flex flex-col items-center gap-4 pt-20 text-center">
            <QuantaLoader size="md" label="Loading report…" />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-5 pt-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-700 bg-ink-900 text-2xl">
              📄
            </div>
            <h1 className="text-lg font-semibold text-ink-100">Report not found</h1>
            <p className="max-w-xs text-sm text-ink-500">
              This report may have been removed or the link is incorrect.
            </p>
            <Link
              to="/"
              className="mt-2 rounded-lg bg-ember-600 px-5 py-2 font-mono text-sm font-bold text-ink-950 shadow-ember-glow transition-colors hover:bg-ember-500"
            >
              Go to QUANTA
            </Link>
          </div>
        )}

        {!loading && report && (
          <>
            {/* Report header */}
            <div className="mb-8 border-b border-ink-700 pb-6">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-ink-500">
                QUANTA Analysis
              </p>
              <h1 className="text-2xl font-bold leading-snug text-ink-100">{report.title}</h1>
              {report.created_at && (
                <p className="mt-2 font-mono text-xs text-ink-500">
                  {formatDate(report.created_at)}
                </p>
              )}
            </div>

            {/* Report content */}
            <div className="text-sm text-ink-100">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                {report.content}
              </ReactMarkdown>
            </div>

            {/* Footer CTA */}
            <div className="mt-16 rounded-xl border border-ember-500/20 bg-ember-600/5 px-6 py-8 text-center">
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ember-500">
                Powered by QUANTA
              </p>
              <p className="mb-5 text-sm text-ink-300">
                Run the same analysis on your own data — free, private, no account required.
              </p>
              <div className="relative inline-flex">
                <span
                  aria-hidden
                  className="animate-glow-pulse pointer-events-none absolute inset-0 rounded-xl bg-ember-500/40 blur-lg"
                />
                <Link
                  to="/"
                  className="relative rounded-xl bg-ember-600 px-8 py-3 font-mono text-sm font-bold text-ink-950 shadow-ember-glow transition-colors hover:bg-ember-500"
                >
                  Analyze Your Own Business with QUANTA — Free
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
