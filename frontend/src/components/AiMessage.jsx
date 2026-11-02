import ReactMarkdown from "react-markdown";
import CodeBlock from "./CodeBlock.jsx";
import PulseLine from "./PulseLine.jsx";

function extractSources(markdown) {
  const seen = new Map();
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let m;
  while ((m = re.exec(markdown)) != null) {
    if (!seen.has(m[2])) seen.set(m[2], m[1]);
  }
  return Array.from(seen, ([url, text]) => ({ url, text }));
}

/** One chat message, card-styled for QUANTA AI. */
export default function AiMessage({ role, content, spark, sparkVariant = "auto" }) {
  const isUser = role === "user";
  const sources = !isUser && content ? extractSources(content) : [];

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`card max-w-[88%] px-4 py-3.5 text-sm leading-relaxed ${isUser ? "bg-ember-600/10" : ""}`}>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-500">
          {isUser ? "You" : "QUANTA AI"}
        </div>

        {isUser ? (
          <div className="whitespace-pre-wrap text-ink-100">{content}</div>
        ) : (
          <div className="markdown-body space-y-2 text-ink-100">
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const text = String(children).replace(/\n$/, "");
                  if (inline || (!match && !text.includes("\n"))) {
                    return (
                      <code className="rounded-md bg-ink-950/60 px-1.5 py-0.5 font-mono text-[12px] text-ember-500" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return <CodeBlock language={match?.[1]} value={text} />;
                },
                p: ({ children }) => <p className="my-1.5">{children}</p>,
                ul: ({ children }) => <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>,
                h1: ({ children }) => <h1 className="mt-3 font-display text-base font-bold">{children}</h1>,
                h2: ({ children }) => <h2 className="mt-3 font-display text-base font-bold">{children}</h2>,
                h3: ({ children }) => <h3 className="mt-2 font-display text-sm font-bold">{children}</h3>,
                table: ({ children }) => (
                  <div className="my-2 overflow-x-auto rounded-xl border border-line/10">
                    <table className="w-full text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border-b border-line/10 bg-ink-950/40 px-2 py-1.5 text-left font-mono font-semibold">{children}</th>
                ),
                td: ({ children }) => <td className="border-b border-line/6 px-2 py-1.5">{children}</td>,
                a: ({ children, href }) => (
                  <a href={href} target="_blank" rel="noreferrer" className="text-ember-500 underline hover:text-ember-600">
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>

            {spark?.length > 1 && (
              <div className="pt-1">
                <PulseLine data={spark} variant={sparkVariant} width={260} height={48} glow animate />
              </div>
            )}

            {sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="pill-chip">
                    {s.text}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
